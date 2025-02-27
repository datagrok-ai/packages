package grok_connect.utils;

import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.ResultSetMetaData;
import java.sql.SQLException;
import java.util.LinkedHashMap;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import grok_connect.GrokConnect;
import grok_connect.connectors_info.FuncCall;
import grok_connect.handlers.QueryHandler;
import grok_connect.log.EventType;
import grok_connect.providers.JdbcDataProvider;
import grok_connect.resultset.ResultSetManager;
import grok_connect.table_query.TableQuery;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import serialization.DataFrame;

public class QueryManager {
    public static final String CHUNK_NUMBER_TAG = "chunkNumber";
    public static final String FETCH_SIZE_KEY = "connectFetchSize";
    public static final String INIT_FETCH_SIZE_KEY = "initConnectFetchSize";
    private static final int MAX_CHUNK_SIZE_BYTES = 10_000_000;
    private static final int MAX_FETCH_SIZE = 100000;
    private static final int MIN_FETCH_SIZE = 100;
    private static final Logger LOGGER = LoggerFactory.getLogger(QueryManager.class);
    public boolean isDebug;
    private final JdbcDataProvider provider;
    private final FuncCall query;
    private final ResultSetManager resultSetManager;
    private int currentFetchSize = MIN_FETCH_SIZE;
    private int initFetchSize = MIN_FETCH_SIZE;
    private int chunkSize = -1;
    private ResultSet resultSet;
    private Connection connection;
    private boolean changedFetchSize;
    private String initMessage;
    private int columnCount;
    private boolean isFinished = false;
    private boolean supportsFetchSize = true;

    public QueryManager(String message) {
        LOGGER.debug("Deserializing json call and preprocessing it...");
        query = GrokConnect.gson.fromJson(message, FuncCall.class);
        query.setParamValues();
        query.afterDeserialization();
        isDebug = query.debugQuery;
        provider = GrokConnect.providerManager.getByName(query.func.connection.dataSource);
        resultSetManager = provider.getResultSetManager();
        initParams();
        if (isDebug)
            initMessage = message;
        LOGGER.debug("Deserialized and preprocessed call");
        processTableQuery();
    }

    private void processTableQuery() {
        if (query.func instanceof TableQuery) {
            LOGGER.debug("Building table query...");
            query.func.query = provider.queryTableSql((TableQuery) query.func);
            LOGGER.debug("TableQuery was built");
        }
    }

    public void initResultSet(FuncCall query) throws GrokConnectException, QueryCancelledByUser, SQLException {
        LOGGER.debug(EventType.CONNECTION_RECEIVE.getMarker(EventType.Stage.START), "Receiving connection to {} database...", provider.descriptor.type);
        connection = provider.getConnection(query.func.connection);
        LOGGER.debug(EventType.CONNECTION_RECEIVE.getMarker(EventType.Stage.END), "Received connection to {} database", provider.descriptor.type);
        resultSet = provider.getResultSet(query, connection, initFetchSize);
        if (resultSet == null) return;
        ResultSetMetaData metaData = resultSet.getMetaData();
        LOGGER.debug("Initializing ResultSet manager...");
        resultSetManager.init(metaData, currentFetchSize);
        LOGGER.debug("ResultSet manager was initialized");
        columnCount = metaData.getColumnCount();
    }

    public void dryRun(boolean skipColumnFillingLog) throws QueryCancelledByUser, SQLException, GrokConnectException {
        FuncCall query = GrokConnect.gson.fromJson(initMessage, FuncCall.class);
        query.setParamValues();
        processTableQuery();
        initResultSet(query);
        String sessionId = MDC.get(QueryHandler.CALL_ID_HEADER);
        if (skipColumnFillingLog)
            MDC.remove(QueryHandler.CALL_ID_HEADER);
        if (changedFetchSize)
            tryFetchSize(currentFetchSize);
        provider.getResultSetSubDf(query, resultSet, provider.getResultSetManager(), -1, columnCount,
                1, true);
        MDC.remove(QueryHandler.CALL_ID_HEADER);
        close();
        MDC.put(QueryHandler.CALL_ID_HEADER, sessionId);
    }

    public DataFrame getSubDF(int dfNumber) throws SQLException, QueryCancelledByUser {
        DataFrame df = new DataFrame();
        if (!isFinished && !resultSet.isClosed() && !connection.isClosed()) {
            if (dfNumber != 1)
                resultSetManager.empty(currentFetchSize);
            int rowsNumber = dfNumber == 1 ? initFetchSize : currentFetchSize;
            df =  provider.getResultSetSubDf(query, resultSet, resultSetManager, rowsNumber, columnCount, dfNumber, false);
            if (df.rowCount == rowsNumber && supportsFetchSize) {
                if (dfNumber == 1 && changedFetchSize)
                    tryFetchSize(currentFetchSize);
                else if (!changedFetchSize)
                    changeFetchSize(df);
            }
            else {
                isFinished = true;
                LOGGER.info("Received all data");
            }
            df.tags = new LinkedHashMap<>();
            df.tags.put(CHUNK_NUMBER_TAG, String.valueOf(dfNumber));
        }
        return df;
    }

    public void close() throws SQLException {
        if (resultSet != null && !resultSet.isClosed())
            resultSet.close();
        if (connection != null && !connection.isClosed()) {
            LOGGER.debug("Closing DB connection...");
            if (!connection.getAutoCommit())
                connection.commit();
            QueryMonitor.getInstance().removeResultSet(query.id);
            connection.close();
            LOGGER.debug("Closed DB connection");
        } else
            QueryMonitor.getInstance().removeResultSet(query.id);
    }

    public boolean isResultSetInitialized() {
        return resultSet != null;
    }

    public FuncCall getQuery() {
        return query;
    }

    private void changeFetchSize(DataFrame df) {
        if (!provider.descriptor.type.equals("Virtuoso")) {
            LOGGER.debug("Calculating dynamically next fetch size...");
            currentFetchSize = getFetchSize(df);
            tryFetchSize(currentFetchSize);
        }
    }

    private int getFetchSize(DataFrame df) {
        int fetchSize = 0;
        if (df.rowCount != 0) {
            int maxChunkSize = chunkSize != -1 ? chunkSize : MAX_CHUNK_SIZE_BYTES;
            fetchSize = Math.round(maxChunkSize / (float) (df.memoryInBytes() / df.rowCount));
        }
        return Math.min(Math.max(MIN_FETCH_SIZE, fetchSize), MAX_FETCH_SIZE);
    }

    private void initParams() {
        query.options.entrySet().removeIf(e -> e.getValue() == null);
        setFetchSize(query.options.getOrDefault(FETCH_SIZE_KEY, "").toString());
        setInitFetchSize(query.options.getOrDefault(INIT_FETCH_SIZE_KEY, "").toString());
    }

    private void setFetchSize(String optionValue) {
        if (optionValue == null || optionValue.isEmpty())
            return;
        Pattern pattern = Pattern.compile("(\\d+) MB");
        Matcher matcher = pattern.matcher(optionValue);
        if (matcher.find())
            chunkSize = Integer.parseInt(matcher.group(1)) * 1_000_000;
        else {
            changedFetchSize = true;
            currentFetchSize = Double.valueOf(optionValue).intValue();
            LOGGER.info("Fetch size was set to {} for all chunks except initial", currentFetchSize);
        }
    }

    private void setInitFetchSize(String optionValue) {
        if (optionValue == null || optionValue.isEmpty()) {
            LOGGER.info("Default init fetch size of {} will be used", initFetchSize);
            return;
        }
        initFetchSize = Double.valueOf(optionValue).intValue();
        LOGGER.info("Init fetch size was set to {}", initFetchSize);
    }

    private void tryFetchSize(int fetchSize) {
        try {
            resultSet.setFetchSize(fetchSize);
            LOGGER.info("Fetch size was set to {}", currentFetchSize);
        } catch (SQLException e) {
            LOGGER.info("Provider {} doesn't support fetch size change", provider.descriptor.type);
            supportsFetchSize = false;
        }
    }
}
