package grok_connect.providers;

import java.io.IOException;
import java.io.PrintWriter;
import java.io.StringWriter;
import java.sql.Array;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.ResultSetMetaData;
import java.sql.SQLException;
import java.sql.Statement;
import java.sql.Timestamp;
import java.text.ParseException;
import java.util.ArrayList;
import java.util.Calendar;
import java.util.List;
import java.util.Properties;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import grok_connect.connectors_info.DataConnection;
import grok_connect.connectors_info.DataProvider;
import grok_connect.connectors_info.DataQuery;
import grok_connect.connectors_info.DbCredentials;
import grok_connect.connectors_info.FuncCall;
import grok_connect.connectors_info.FuncParam;
import grok_connect.log.EventType;
import grok_connect.resultset.DefaultResultSetManager;
import grok_connect.resultset.ResultSetManager;
import grok_connect.table_query.AggrFunctionInfo;
import grok_connect.table_query.FieldPredicate;
import grok_connect.table_query.GroupAggregation;
import grok_connect.table_query.TableQuery;
import grok_connect.utils.ConnectionPool;
import grok_connect.utils.GrokConnectException;
import grok_connect.utils.PatternMatcher;
import grok_connect.utils.PatternMatcherResult;
import grok_connect.utils.QueryCancelledByUser;
import grok_connect.utils.QueryMonitor;
import org.apache.commons.lang.NotImplementedException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import serialization.DataFrame;
import serialization.Types;
import software.aws.neptune.opencypher.resultset.OpenCypherResultSet;

public abstract class JdbcDataProvider extends DataProvider {
    protected Logger logger = LoggerFactory.getLogger(this.getClass().getName());
    protected QueryMonitor queryMonitor = QueryMonitor.getInstance();
    protected String driverClassName;

    public void prepareProvider() throws ClassNotFoundException {
        Class.forName(driverClassName);
    }

    public Connection getConnection(DataConnection conn)
            throws ClassNotFoundException, SQLException, GrokConnectException {
        prepareProvider();
        return ConnectionPool.getInstance().getConnection(getConnectionString(conn), getProperties(conn), driverClassName);
    }

    public Properties getProperties(DataConnection conn) {
        return defaultConnectionProperties(conn);
    }

    public boolean autoInterpolation() {
        return true;
    }

    protected Integer getTimeout() {
        return null;
    }

    public String getConnectionString(DataConnection conn) {
        return conn.hasCustomConnectionString()
                ? (String)conn.parameters.get(DbCredentials.CONNECTION_STRING)
                : getConnectionStringImpl(conn);
    }

    public String getConnectionStringImpl(DataConnection conn) {
        return conn.connectionString;
    }

    // "CONN_AVAILABLE" or exception text
    public String testConnection(DataConnection conn) throws ClassNotFoundException, SQLException {
        Connection sqlConnection = null;
        String res;
        try {
            sqlConnection = getConnection(conn);
            if (sqlConnection.isClosed() || !sqlConnection.isValid(30))
                res = "Connection is not available";
            else
                res = DataProvider.CONN_AVAILABLE;
        } catch (Throwable ex) {
            StringWriter errors = new StringWriter();
            errors.write("ERROR:\n" + ex + "\n\nSTACK TRACE:\n");
            ex.printStackTrace(new PrintWriter(errors));
            System.out.println(errors);
            res = errors.toString();
        }
        finally {
            if (sqlConnection != null)
                sqlConnection.close();
        }
        return res;
    }

    public DataFrame getSchemas(DataConnection connection)
            throws ClassNotFoundException, SQLException, ParseException, IOException, QueryCancelledByUser, GrokConnectException {
        FuncCall queryRun = new FuncCall();
        queryRun.func = new DataQuery();
        queryRun.func.query = getSchemasSql(connection.getDb());
        queryRun.func.connection = connection;

        return execute(queryRun);
    }

    public DataFrame getSchema(DataConnection connection, String schema, String table)
            throws ClassNotFoundException, SQLException, ParseException, IOException, QueryCancelledByUser, GrokConnectException {
        FuncCall queryRun = new FuncCall();
        queryRun.func = new DataQuery();
        queryRun.func.query = getSchemaSql(connection.getDb(), schema, table);
        queryRun.func.connection = connection;

        return execute(queryRun);
    }

    public String getSchemasSql(String db) {
        throw new UnsupportedOperationException();
    }

    public String getSchemaSql(String db, String schema, String table) {
        throw new UnsupportedOperationException();
    }

    public ResultSet executeQuery(String query, FuncCall queryRun,
                                  Connection connection, int timeout, Logger queryLogger, int fetchSize) throws SQLException {
        boolean supportsTransactions = connection.getMetaData().supportsTransactions();
        queryLogger.trace(EventType.MISC.getMarker(), "Provider supports transactions: {}", supportsTransactions);
        if (supportsTransactions)
            connection.setAutoCommit(false);

        DataQuery dataQuery = queryRun.func;
        String mainCallId = (String) queryRun.aux.get("mainCallId");

        ResultSet resultSet;
        if (dataQuery.inputParamsCount() > 0) {
            queryLogger.debug(EventType.QUERY_PARSE.getMarker(EventType.Stage.START), "Converting query");
            query = convertPatternParamsToQueryParams(queryRun, query);
            queryLogger.debug(EventType.QUERY_PARSE.getMarker(EventType.Stage.END), "Query after converting: {}",
                    query);
            if (autoInterpolation()) {
                StringBuilder queryBuffer = new StringBuilder();
                queryLogger.debug(EventType.QUERY_INTERPOLATION.getMarker(EventType.Stage.START), "Query will be auto interpolated");
                List<String> names = getParameterNames(query, dataQuery, queryBuffer);
                query = queryBuffer.toString();
                queryLogger.debug(EventType.QUERY_INTERPOLATION.getMarker(EventType.Stage.END), "Interpolated query: {}",
                        query);
                PreparedStatement statement = connection.prepareStatement(query);
                queryMonitor.addNewStatement(mainCallId, statement);
                List<String> stringValues = new ArrayList<>();
                queryLogger.debug(EventType.STATEMENT_PARAMETERS_REPLACEMENT.getMarker(EventType.Stage.START), "Query detected parameters: {}", names);
                int i = 0;
                for (int n = 0; n < names.size(); n++) {
                    FuncParam param = dataQuery.getParam(names.get(n));
                    String stringValue;
                    if (param.propertyType.equals(Types.DATE_TIME)) {
                        stringValue = setDateTimeValue(param, statement, n + i + 1);
                    } else if (param.propertyType.equals(Types.LIST) && param.propertySubType.equals(Types.STRING)) {
                        if (param.value == null)
                            stringValue = "null";
                        else
                            stringValue = param.value.toString();
                        i = i + setArrayParamValue(statement, n + i + 1, param);
                    } else {
                        if (param.value == null) {
                            stringValue = "null";
                            statement.setNull(n + i + 1, java.sql.Types.VARCHAR);
                        } else {
                            stringValue = param.value.toString();
                            statement.setObject(n + i + 1, param.value);
                        }
                    }
                    stringValues.add(stringValue);
                }
                queryLogger.debug(EventType.STATEMENT_PARAMETERS_REPLACEMENT.getMarker(EventType.Stage.END), "Parameters were replaced by: {}", stringValues);
                resultSet = executeStatement(statement, queryLogger, timeout, mainCallId, fetchSize);
            } else {
                queryLogger.debug(EventType.QUERY_INTERPOLATION.getMarker(EventType.Stage.START), "Query will be manually interpolated");
                query = manualQueryInterpolation(query, dataQuery);
                queryLogger.debug(EventType.QUERY_INTERPOLATION.getMarker(EventType.Stage.END), "Interpolated query");
                resultSet = executeStatement(connection.prepareStatement(query), queryLogger, timeout, mainCallId, fetchSize);
            }
        } else {
            queryLogger.debug(EventType.QUERY_PARSE.getMarker(), "Query without parameters");
            resultSet = executeStatement(connection.prepareStatement(query), queryLogger, timeout, mainCallId, fetchSize);
        }

        return resultSet;
    }

    private ResultSet executeStatement(PreparedStatement statement, Logger queryLogger,
                                       int timeout, String mainCallId, int fetchSize) throws SQLException {
        queryMonitor.addNewStatement(mainCallId, statement);
        setQueryTimeOut(statement, timeout);
        queryLogger.info(EventType.STATEMENT_EXECUTION.getMarker(EventType.Stage.START), "Executing statement");
        statement.setFetchSize(fetchSize);
        ResultSet resultSet = executeStatement(statement);
        queryLogger.info(EventType.STATEMENT_EXECUTION.getMarker(EventType.Stage.END), "Statement was executed");
        queryMonitor.removeStatement(mainCallId);
        return resultSet;
    }

    protected ResultSet executeStatement(PreparedStatement statement) throws SQLException {
        return statement.execute() ? statement.getResultSet() : null;
    }

    private void setQueryTimeOut(Statement statement, int timeout) {
        try {
            statement.setQueryTimeout(timeout);
        } catch (SQLException exception) {
            logger.debug("setQueryTimeout is not supported for {}", descriptor.type);
        }
    }

    protected String setDateTimeValue(FuncParam funcParam, PreparedStatement statement, int parameterIndex) {
        Calendar calendar = javax.xml.bind.DatatypeConverter.parseDateTime((String)funcParam.value);
        Timestamp ts = new Timestamp(calendar.getTime().getTime());
        try {
            statement.setTimestamp(parameterIndex, ts);
            return ts.toString();
        } catch (SQLException e) {
            throw new RuntimeException(String.format("Something went wrong when setting datetime parameter at %s index",
                    parameterIndex), e);
        }
    }

    protected String manualQueryInterpolation(String query, DataQuery dataQuery) {
        Pattern pattern = Pattern.compile("(?m)@(\\w+)");
        // Put parameters into func
        Matcher matcher = pattern.matcher(query);
        StringBuilder queryBuffer = new StringBuilder();
        int idx = 0;
        while (matcher.find()) {
            String name = matcher.group().substring(1);
            queryBuffer.append(query, idx, matcher.start());
            interpolateParameters(queryBuffer, dataQuery, name);
            idx = matcher.end();
        }
        queryBuffer.append(query.substring(idx));
        query = queryBuffer.toString();
        return query;
    }

    protected void interpolateParameters(StringBuilder queryBuffer, DataQuery dataQuery, String paramName) {
        for (FuncParam param: dataQuery.getInputParams()) {
            if (param.name.equals(paramName)) {
                switch (param.propertyType) {
                    case Types.DATE_TIME:
                        queryBuffer.append(castParamValueToSqlDateTime(param));
                        return;
                    case Types.BOOL:
                        queryBuffer.append(interpolateBool(param));
                        return;
                    case Types.STRING: //todo: support escaping
                        queryBuffer.append(interpolateString(param));
                        return;
                    case Types.LIST: //todo: extract submethod
                        if (param.propertySubType.equals(Types.STRING)) {
                            @SuppressWarnings(value = "unchecked")
                            ArrayList<String> value = ((ArrayList<String>) param.value);
                            for (int i = 0; i < value.size(); i++) {
                                queryBuffer.append(String.format("'%s'", value.get(i)));
                                if (i < value.size() - 1)
                                    queryBuffer.append(",");
                            }
                            return;
                            //todo: implement other types
                        } else {
                            throw new NotImplementedException("Non-string lists are not implemented for manual param interpolation providers");
                        }
                    default:
                        queryBuffer.append(param.value.toString());
                }
                return;
            }
        }
        queryBuffer
                .append("@")
                .append(paramName); // there are no such FuncParam, so it means that it is not a param
    }

    protected String interpolateString(FuncParam param) {
        return String.format("'%s'", param.value.toString());
    }

    protected String interpolateBool(FuncParam param) {
        return ((boolean) param.value) ? "1=1" : "1=0";
    }

    protected int setArrayParamValue(PreparedStatement statement, int n, FuncParam param) throws SQLException {
        @SuppressWarnings (value="unchecked")
        ArrayList<String> values = (ArrayList<String>) param.value;
        Array array = statement.getConnection().createArrayOf("VARCHAR", values.toArray());
        statement.setArray(n, array);
        return 0;
    }

    protected List<String> getParameterNames(String query, DataQuery dataQuery, StringBuilder queryBuffer) {
        List<String> names = new ArrayList<>();
        String regexComment = String.format("(?m)^(?<!['\\\"])%s.*(?!['\\\"])$", descriptor.commentStart);
        query = query
                .replaceAll(regexComment, "")
                .trim();
        Pattern pattern = Pattern.compile("(?m)@(\\w+)");
        Matcher matcher = pattern.matcher(query);
        int idx = 0;
        while (matcher.find()) {
            String name = matcher.group(1);
            if (dataQuery.existsParam(name)) {
                queryBuffer.append(query, idx, matcher.start());
                appendQueryParam(dataQuery, name, queryBuffer);
                idx = matcher.end();
                names.add(name);
            }
        }
        queryBuffer.append(query, idx, query.length());
        return names;
    }

    protected void appendQueryParam(DataQuery dataQuery, String paramName, StringBuilder queryBuffer) {
        queryBuffer.append("?");
    }

    public ResultSet getResultSet(FuncCall queryRun, Connection connection,
                                  Logger queryLogger, int fetchSize) throws QueryCancelledByUser, SQLException {
        Integer providerTimeout = getTimeout();
        int timeout = providerTimeout != null ? providerTimeout : (queryRun.options != null && queryRun.options.containsKey(DataProvider.QUERY_TIMEOUT_SEC))
                ? ((Double)queryRun.options.get(DataProvider.QUERY_TIMEOUT_SEC)).intValue() : 300;

        try {
            // Remove header lines
            DataQuery dataQuery = queryRun.func;
            String query = dataQuery.query;
            String commentStart = descriptor.commentStart;

            ResultSet resultSet = null;

            if (!(queryRun.func.options != null
                    && queryRun.func.options.containsKey("batchMode")
                    && queryRun.func.options.get("batchMode").equals("true"))) {
                query = query.replaceAll("(?m)^" + commentStart + ".*\\n", "");
                resultSet = executeQuery(query, queryRun, connection, timeout, queryLogger, fetchSize);
            } else {
                queryLogger.debug(EventType.MISC.getMarker(), "Executing batch mode");
                String[] queries = query.replaceAll("\r\n", "\n").split("\n--batch\n");
                for (String currentQuery : queries)
                    resultSet = executeQuery(currentQuery, queryRun, connection, timeout, queryLogger, fetchSize); // IT WON'T WORK?
            }

            return resultSet;
        } catch (SQLException e) {
            if (queryMonitor.checkCancelledId((String) queryRun.aux.get("mainCallId")))
                throw new QueryCancelledByUser();
            else throw e;
        }
    }
    public DataFrame getResultSetSubDf(FuncCall queryRun, ResultSet resultSet, ResultSetManager resultSetManager, int maxIterations, int columnCount,
                                       Logger queryLogger, int operationNumber, boolean dryRun) throws SQLException, QueryCancelledByUser {
        if (queryMonitor.checkCancelledId((String) queryRun.aux.get("mainCallId"))) {
            queryLogger.info(EventType.MISC.getMarker(), "Query was canceled");
            throw new QueryCancelledByUser();
        }

        try {
            EventType resultSetProcessingEventType = EventType.RESULT_SET_PROCESSING_WITH_DATAFRAME_FILL;
            if (dryRun)
                resultSetProcessingEventType = EventType.RESULT_SET_PROCESSING_WITHOUT_DATAFRAME_FILL;
            queryLogger.debug(resultSetProcessingEventType.getMarker(operationNumber, EventType.Stage.START),
                    "Column filling was started");
            int rowCount = 0;
            while ((maxIterations < 0 || rowCount < maxIterations) && resultSet.next()) {
                rowCount++;
                for (int c = 1; c < columnCount + 1; c++) {
                    Object value = getObjectFromResultSet(resultSet, c);

                    if (dryRun) continue;
                    resultSetManager.processValue(value, c);

                    if (queryMonitor.checkCancelledIdResultSet(queryRun.id)) {
                        queryLogger.info(EventType.MISC.getMarker(), "Query was canceled");
                        DataFrame dataFrame = new DataFrame();
                        dataFrame.addColumns(resultSetManager.getProcessedColumns());
                        resultSet.close();
                        queryMonitor.removeResultSet(queryRun.id);
                        return dataFrame;
                    }
                }
            }
            queryLogger.debug(resultSetProcessingEventType.getMarker(operationNumber, EventType.Stage.END),
                    "Column filling was finished");

            DataFrame dataFrame = new DataFrame();
            if (dryRun)
                return dataFrame;
            dataFrame.addColumns(resultSetManager.getProcessedColumns());
            return dataFrame;
        } catch (Exception e) {
            queryLogger.warn(EventType.ERROR.getMarker(), "An exception was thrown", e);
            if (resultSet != null && resultSet.isClosed()) {
                throw new QueryCancelledByUser();
            }
            throw new RuntimeException("Something went wrong", e);
        }
    }

    public DataFrame execute(FuncCall queryRun)
            throws ClassNotFoundException, SQLException, ParseException, IOException, QueryCancelledByUser, GrokConnectException {
        try (Connection connection = getConnection(queryRun.func.connection)) {
            ResultSet resultSet = getResultSet(queryRun, connection, logger, 100);

            if (resultSet == null)
                return new DataFrame();
            ResultSetManager resultSetManager = getResultSetManager();
            ResultSetMetaData metaData = resultSet.getMetaData();
            resultSetManager.init(metaData, 100);
            return getResultSetSubDf(queryRun, resultSet, resultSetManager, -1, metaData.getColumnCount(),
                    logger, 1, false);
        } catch (SQLException e) {
            if (queryMonitor.checkCancelledId((String) queryRun.aux.get("mainCallId")))
                throw new QueryCancelledByUser();
            else throw e;
        }
    }

    protected Object getObjectFromResultSet(ResultSet resultSet, int c) {
        try {
            return resultSet.getObject(c);
        }catch (SQLException e) {
            throw new RuntimeException("Something went wrong when getting object from result set", e);
        }
    }

    protected static String paramToNamesString(FuncParam param, PatternMatcher matcher, String type,
                                               PatternMatcherResult result) {
        StringBuilder builder = new StringBuilder();
        for (int n = 0 ; n < matcher.values.size(); n++) {
            String name = param.name + n;
            builder.append("@");
            builder.append(name);
            builder.append(",");
            result.params.add(new FuncParam(type, name, matcher.values.get(n)));
        }
        return builder.deleteCharAt(builder.length() - 1).toString();
    }

    public PatternMatcherResult numericPatternConverter(FuncParam param, PatternMatcher matcher) {
        PatternMatcherResult result = new PatternMatcherResult();
        String type = param.options.get("pattern");
        switch (matcher.op) {
            case PatternMatcher.NONE:
                result.query = "(1 = 1)";
                break;
            case PatternMatcher.RANGE_NUM:
                String name0 = param.name + "R0";
                String name1 = param.name + "R1";
                result.query = "(" + matcher.colName + " >= @" + name0 + " AND " + matcher.colName + " <= @" + name1 + ")";
                result.params.add(new FuncParam(type, name0, matcher.values.get(0)));
                result.params.add(new FuncParam(type, name1, matcher.values.get(1)));
                break;
            case PatternMatcher.IN:
            case PatternMatcher.NOT_IN:
                String names = paramToNamesString(param, matcher, type, result);
                result.query = getInQuery(matcher, names);
                break;
            case PatternMatcher.IS_NULL:
            case PatternMatcher.IS_NOT_NULL:
                result.query = String.format("(%s %s)", matcher.colName, matcher.op);
                break;
            default:
                result.query = "(" + matcher.colName + " " + matcher.op + " @" + param.name + ")";
                result.params.add(new FuncParam(type, param.name, matcher.values.get(0)));
                break;
        }
        return result;
    }
    protected String getInQuery(PatternMatcher matcher, String names) {
        return String.format("(%s %s (%s))", matcher.colName, matcher.op, names);
    }

    public PatternMatcherResult stringPatternConverter(FuncParam param, PatternMatcher matcher) {
        PatternMatcherResult result = new PatternMatcherResult();

        if (matcher.op.equals(PatternMatcher.NONE)) {
            result.query = "(1 = 1)";
            return result;
        }

        String type = "string";
        String _query = "(LOWER(" + matcher.colName + ") LIKE @" + param.name + ")";
        List<Object> values = matcher.values;
        String value = null;
        if (values.size() > 0) {
            value = ((String) values.get(0)).toLowerCase();
        }

        switch (matcher.op) {
            case PatternMatcher.EQUALS:
                result.query = _query;
                result.params.add(new FuncParam(type, param.name, value));
                break;
            case PatternMatcher.CONTAINS:
                result.query = _query;
                result.params.add(new FuncParam(type, param.name, "%" + value + "%"));
                break;
            case PatternMatcher.STARTS_WITH:
                result.query = _query;
                result.params.add(new FuncParam(type, param.name, value + "%"));
                break;
            case PatternMatcher.ENDS_WITH:
                result.query = _query;
                result.params.add(new FuncParam(type, param.name, "%" + value));
                break;
            case PatternMatcher.REGEXP:
                result.query = getRegexQuery(matcher.colName, value);
                result.params.add(new FuncParam(type, param.name, value));
                break;
            case PatternMatcher.IN:
            case PatternMatcher.NOT_IN:
                String names = paramToNamesString(param, matcher, type, result);
                result.query = getInQuery(matcher, names);
                break;
            case PatternMatcher.IS_NULL:
            case PatternMatcher.IS_NOT_NULL:
                result.query = String.format("(%s %s)", matcher.colName, matcher.op);
                break;
            default:
                result.query = "(1 = 1)";
                break;
        }

        return result;
    }

    protected String getRegexQuery(String columnName, String regexExpression) {
        throw new UnsupportedOperationException("REGEXP is not supported for this provider");
    }

    public PatternMatcherResult dateTimePatternConverter(FuncParam param, PatternMatcher matcher) {
        PatternMatcherResult result = new PatternMatcherResult();

        switch (matcher.op) {
            case PatternMatcher.EQUALS:
                result.query = "(" + matcher.colName + " = @" + param.name + ")";
                result.params.add(new FuncParam("datetime", param.name, matcher.values.get(0)));
                break;
            case PatternMatcher.BEFORE:
            case PatternMatcher.AFTER:
                result.query = "(" + matcher.colName + PatternMatcher.cmp(matcher.op, matcher.include1) + "@" + param.name + ")";
                result.params.add(new FuncParam("datetime", param.name, matcher.values.get(0)));
                break;
            case PatternMatcher.RANGE_DATE_TIME:
                String name0 = param.name + "R0";
                String name1 = param.name + "R1";
                result.query = "(" + matcher.colName + PatternMatcher.cmp(PatternMatcher.AFTER, matcher.include1) + "@" + name0 + " AND " +
                        matcher.colName + PatternMatcher.cmp(PatternMatcher.BEFORE, matcher.include2) + "@" + name1 + ")";
                result.params.add(new FuncParam("datetime", name0, matcher.values.get(0)));
                result.params.add(new FuncParam("datetime", name1, matcher.values.get(1)));
                break;
            case PatternMatcher.IS_NULL:
            case PatternMatcher.IS_NOT_NULL:
                result.query = String.format("(%s %s)", matcher.colName, matcher.op);
                break;
            case PatternMatcher.NONE:
            default:
                result.query = "(1 = 1)";
                break;
        }

        return result;
    }

    protected String aggrToSql(GroupAggregation aggr) {
        AggrFunctionInfo funcInfo = null;
        for (AggrFunctionInfo info: descriptor.aggregations) {
            if (info.functionName.equals(aggr.aggType)) {
                funcInfo = info;
                break;
            }
        }
        if (funcInfo != null) {
            String sql = funcInfo.dbFunctionName.replaceAll("#", aggr.colName);
            return sql + " as \"" + sql + "\"";
        } else
            return null;
    }

    public String addBrackets(String name) {
        String brackets = descriptor.nameBrackets;
        return (name.contains(" ") && !name.startsWith(brackets.substring(0, 1)))
                ? brackets.charAt(0) + name + brackets.substring(brackets.length() - 1)
                : name;
    }

    public String limitToSql(String query, Integer limit) {
        return query + "limit " + limit.toString();
    }

    private String patternToSql(FieldPredicate condition) {
        return condition.matcher.toSql(condition.dataType, condition.field);
    }

    public String queryTableSql(DataConnection conn, TableQuery query) {
        return query.toSql(this::aggrToSql, this::patternToSql, this::limitToSql, this::addBrackets,
                descriptor.limitAtEnd);
    }

    public DataFrame queryTable(DataConnection conn, TableQuery query)
            throws ClassNotFoundException, SQLException, ParseException, IOException, QueryCancelledByUser, GrokConnectException {
        FuncCall queryRun = new FuncCall();
        queryRun.func = new DataQuery();
        String sql = queryTableSql(conn, query);
        if (sql == null)
            return new DataFrame();
        queryRun.func.query = sql;
        queryRun.func.connection = conn;
        return execute(queryRun);
    }

    public String castParamValueToSqlDateTime(FuncParam param) {
        return "datetime('" + param.value.toString() + "')";
    }

    public static java.util.Properties defaultConnectionProperties(DataConnection conn) {
        java.util.Properties properties = new java.util.Properties();
        if (conn.credentials != null) {
            if (conn.credentials.getLogin() != null)
                properties.setProperty("user", conn.credentials.getLogin());
            if (conn.credentials.getPassword() != null)
                properties.setProperty("password", conn.credentials.getPassword());
        }
        return properties;
    }

    public ResultSetManager getResultSetManager() {
        return DefaultResultSetManager.getDefaultManager();
    }
}
