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
import grok_connect.log.EventType;
import grok_connect.log.QueryLogger;
import grok_connect.providers.JdbcDataProvider;
import grok_connect.resultset.ResultSetManager;
import org.slf4j.Logger;
import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import serialization.DataFrame;

public class QueryManager {
    public static final String CHUNK_NUMBER_TAG = "chunkNumber";
    private static final Gson gson = new GsonBuilder()
            .registerTypeAdapter(Property.class, new PropertyAdapter())
            .create();
    public static final String FETCH_SIZE_KEY = "connectFetchSize";
    public static final String INIT_FETCH_SIZE_KEY = "initConnectFetchSize";
    private static final int MAX_CHUNK_SIZE_BYTES = 10_000_000;
    private static final int MAX_FETCH_SIZE = 100000;
    private static final int MIN_FETCH_SIZE = 100;
    public boolean isDebug;
    private final JdbcDataProvider provider;
    private final Logger logger;
    private final QueryLogger queryLogger;
    private final FuncCall query;
    private final ResultSetManager resultSetManager;
    private int currentFetchSize = MIN_FETCH_SIZE;
    private int initFetchSize = MIN_FETCH_SIZE;
    private int chunkSize = -1;
    private ResultSet resultSet;
    private Connection connection;
    private boolean changedFetchSize;
    private boolean supportTransactions;
    private String initMessage;
    private int columnCount;
    public boolean isFinished = false;

    public QueryManager(String message, QueryLogger queryLogger) {
        this.logger = queryLogger.getLogger();
        this.queryLogger = queryLogger;
        logger.debug("Deserializing json call and preprocessing it...");
        query = gson.fromJson(message, FuncCall.class);
        query.setParamValues();
        query.afterDeserialization();
        isDebug = query.debugQuery;
        provider = GrokConnect.providerManager.getByName(query.func.connection.dataSource);
        resultSetManager = provider.getResultSetManager();
        initParams();
        if (isDebug)
            initMessage = message;
        logger.debug("Deserialized and preprocessed call");
    }

    public void initResultSet(FuncCall query) throws GrokConnectException, QueryCancelledByUser, SQLException {
        logger.debug(EventType.CONNECTION_RECEIVE.getMarker(EventType.Stage.START), "Receiving connection to {} database...", provider.descriptor.type);
        connection = provider.getConnection(query.func.connection);
        logger.debug(EventType.CONNECTION_RECEIVE.getMarker(EventType.Stage.END), "Received connection to {} database", provider.descriptor.type);
        resultSet = provider.getResultSet(query, connection, logger, initFetchSize);
        if (resultSet == null) return;
        supportTransactions = connection.getMetaData().supportsTransactions();
        ResultSetMetaData metaData = resultSet.getMetaData();
        logger.debug("Initializing ResultSet manager...");
        resultSetManager.init(metaData, currentFetchSize);
        logger.debug("ResultSet manager was initialized");
        columnCount = metaData.getColumnCount();
    }

    public void dryRun(boolean skipColumnFillingLog) throws QueryCancelledByUser, SQLException, GrokConnectException {
        // need to create new FuncCall on every run because state of params changes irrevocably after each run
        queryLogger.writeLog(false);
        FuncCall query = gson.fromJson(initMessage, FuncCall.class);
        query.setParamValues();
        initResultSet(query);
        queryLogger.writeLog(!skipColumnFillingLog);
        if (supportTransactions && changedFetchSize) {
            resultSet.setFetchSize(currentFetchSize);
            queryLogger.getLogger().debug("Fetch size of {} will be used for dry run", currentFetchSize);
        }
        provider.getResultSetSubDf(query, resultSet, provider.getResultSetManager(), -1, columnCount, logger, 1, true);
        queryLogger.writeLog(false);
        close();
        queryLogger.writeLog(true);
    }

    public DataFrame getSubDF(int dfNumber) throws SQLException, QueryCancelledByUser {
        DataFrame df = new DataFrame();
        if (!isFinished && !resultSet.isClosed() && !connection.isClosed()) {
            if (dfNumber != 1) resultSetManager.empty();
            int rowsNumber = dfNumber == 1 ? initFetchSize : currentFetchSize;
            df =  provider.getResultSetSubDf(query, resultSet, resultSetManager, rowsNumber, columnCount, logger, dfNumber, false);
            if (df.rowCount == rowsNumber) {
                if (dfNumber == 1 && supportTransactions && changedFetchSize)
                    resultSet.setFetchSize(currentFetchSize);
                else if (!changedFetchSize)
                    changeFetchSize(df);
            }
            else {
                isFinished = true;
                logger.info("Received all data");
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
            logger.debug("Closing DB connection...");
            if (!connection.getAutoCommit())
                connection.commit();
            QueryMonitor.getInstance().removeResultSet(query.id);
            connection.close();
            logger.debug("Closed DB connection");
        } else
            QueryMonitor.getInstance().removeResultSet(query.id);
    }

    public boolean isResultSetInitialized() {
        return resultSet != null;
    }

    public FuncCall getQuery() {
        return query;
    }

    private void changeFetchSize(DataFrame df) throws SQLException {
        if (supportTransactions && !provider.descriptor.type.equals("Virtuoso")) {
            logger.debug("Calculating dynamically next fetch size...");
            currentFetchSize = getFetchSize(df);
            resultSet.setFetchSize(currentFetchSize);
            logger.info("Calculated new fetch size. Fetch size was set to {}", currentFetchSize);
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
            logger.info("Fetch size was set to {} for all chunks except initial", currentFetchSize);
        }
    }

    private void setInitFetchSize(String optionValue) {
        if (optionValue == null || optionValue.isEmpty()) {
            logger.info("Default init fetch size of {} will be used", initFetchSize);
            return;
        }
        initFetchSize = Double.valueOf(optionValue).intValue();
        logger.info("Init fetch size was set to {}", initFetchSize);
    }
}
