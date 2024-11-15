package grok_connect.providers;

import java.sql.Array;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.ResultSetMetaData;
import java.sql.SQLException;
import java.sql.Statement;
import java.sql.Timestamp;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Calendar;
import java.util.List;
import java.util.Properties;
import java.util.TimeZone;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

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
import serialization.StringColumn;
import serialization.Types;

public abstract class JdbcDataProvider extends DataProvider {
    protected Logger logger = LoggerFactory.getLogger(this.getClass().getName());
    protected QueryMonitor queryMonitor = QueryMonitor.getInstance();
    protected String driverClassName;

    public void prepareProvider() throws GrokConnectException {
    }

    public Connection getConnection(DataConnection conn) throws SQLException, GrokConnectException {
        prepareProvider();
        return ConnectionPool.getConnection(getConnectionString(conn), getProperties(conn), driverClassName);
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

    public void testConnection(DataConnection conn) throws GrokConnectException {
        try (Connection connection = getConnection(conn)) {
            // just open and close the connection
        } catch (SQLException e) {
            throw new GrokConnectException(e);
        }
    }

    public DataFrame getSchemas(DataConnection connection) throws QueryCancelledByUser, GrokConnectException {
        FuncCall queryRun = new FuncCall();
        queryRun.func = new DataQuery();
        queryRun.func.query = getSchemasSql(connection.getDb());
        queryRun.func.connection = connection;

        return execute(queryRun);
    }

    public DataFrame getSchema(DataConnection connection, String schema, String table) throws QueryCancelledByUser,
            GrokConnectException {
        FuncCall queryRun = new FuncCall();
        queryRun.func = new DataQuery();
        queryRun.func.query = getSchemaSql(connection.getDb(), schema, table);
        queryRun.func.connection = connection;

        return execute(queryRun);
    }

    public List<String> getUniqueColumns(DataConnection conn, String schema, String table) throws GrokConnectException {
        try (Connection connection = getConnection(conn);
             ResultSet rs = connection.getMetaData().getIndexInfo(conn.getDb(), schema, table, true, false)) {
            List<String> uniqueColumns = new ArrayList<>();
            while(rs.next())
                uniqueColumns.add(rs.getString("COLUMN_NAME"));
            return uniqueColumns;

        } catch (SQLException e) {
            throw new GrokConnectException(e);
        }
    }

    public DataFrame getForeignKeys(DataConnection conn, String schema) throws GrokConnectException, QueryCancelledByUser {
        try (Connection connection = getConnection(conn);
             ResultSet rs = connection.getMetaData().getExportedKeys(null, schema, null)) {
            DataFrame result = DataFrame.fromColumns(new StringColumn("table_schema"),
                    new StringColumn("constraint_name"), new StringColumn("table_name"),
                    new StringColumn("column_name"), new StringColumn("foreign_table_name"), new StringColumn("foreign_column_name"));
            while(rs.next())
                result.addRow(rs.getString("FKTABLE_SCHEM"), rs.getString("FK_NAME"), rs.getString("FKTABLE_NAME"),
                        rs.getString("FKCOLUMN_NAME"), rs.getString("PKTABLE_NAME"), rs.getString("PKCOLUMN_NAME"));
            return result;

        } catch (SQLException e) {
            throw new GrokConnectException(e);
        }
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
        queryLogger.trace("Provider {} transactions", supportsTransactions ? "supports" : "doesn't support");
        if (supportsTransactions)
            connection.setAutoCommit(false);

        DataQuery dataQuery = queryRun.func;
        String mainCallId = (String) queryRun.aux.get("mainCallId");

        ResultSet resultSet;
        if (dataQuery.inputParamsCount() > 0) {
            queryLogger.debug(EventType.QUERY_PARSE.getMarker(EventType.Stage.START), "Converting query pattern parameters...");
            query = convertPatternParamsToQueryParams(queryRun, query);
            queryLogger.debug(EventType.QUERY_PARSE.getMarker(EventType.Stage.END), "Converted query pattern parameters");
            if (autoInterpolation()) {
                StringBuilder queryBuffer = new StringBuilder();
                queryLogger.debug(EventType.QUERY_INTERPOLATION.getMarker(EventType.Stage.START), "Interpolating automatically SQL query parameters...");
                List<String> names = getParameterNames(query, dataQuery, queryBuffer);
                query = queryBuffer.toString();
                queryLogger.debug(EventType.QUERY_INTERPOLATION.getMarker(EventType.Stage.END), "Interpolated SQL query parameters. Detected {} parameters", names.size());
                queryLogger.info("Query before execution: {}", query);

                queryLogger.debug("Creating PreparedStatement...");
                PreparedStatement statement = connection.prepareStatement(query);
                queryLogger.debug("Created PreparedStatement");

                queryMonitor.addNewStatement(mainCallId, statement);
                queryLogger.debug(EventType.STATEMENT_PARAMETERS_REPLACEMENT.getMarker(EventType.Stage.START), "Replacing designated query parameters ? with actual values...");
                int i = 0;
                for (int n = 0; n < names.size(); n++) {
                    FuncParam param = dataQuery.getParam(names.get(n));
                    if (param.propertyType.equals(Types.DATE_TIME)) {
                        setDateTimeValue(param, statement, n + i + 1);
                    }
                    else if (param.propertyType.equals(Types.LIST) && param.propertySubType.equals(Types.STRING)) {
                        i = i + setArrayParamValue(statement, n + i + 1, param);
                    }
                    else {
                        if (param.value == null) {
                            statement.setNull(n + i + 1, java.sql.Types.VARCHAR);
                        }
                        else
                            statement.setObject(n + i + 1, param.value);
                    }
                }
                queryLogger.debug(EventType.STATEMENT_PARAMETERS_REPLACEMENT.getMarker(EventType.Stage.END), "Replaced designated query parameters");
                resultSet = executeStatement(statement, queryLogger, timeout, mainCallId, fetchSize);
            } else {
                queryLogger.debug(EventType.QUERY_INTERPOLATION.getMarker(EventType.Stage.START), "Interpolating manually SQL query parameters...");
                query = manualQueryInterpolation(query, dataQuery);
                queryLogger.debug(EventType.QUERY_INTERPOLATION.getMarker(EventType.Stage.END), "Interpolated SQL query parameters");
                queryLogger.info("Query before execution: {}", query);
                resultSet = executeStatement(connection.prepareStatement(query), queryLogger, timeout, mainCallId, fetchSize);
            }
        } else {
            queryLogger.info("Query before execution: {}", query);
            resultSet = executeStatement(connection.prepareStatement(query), queryLogger, timeout, mainCallId, fetchSize);
        }

        return resultSet;
    }

    private ResultSet executeStatement(PreparedStatement statement, Logger queryLogger,
                                       int timeout, String mainCallId, int fetchSize) throws SQLException {
        queryMonitor.addNewStatement(mainCallId, statement);
        setQueryTimeOut(statement, timeout);
        queryLogger.debug(EventType.STATEMENT_EXECUTION.getMarker(EventType.Stage.START), "Executing Statement...");
        statement.setFetchSize(fetchSize);
        ResultSet resultSet = executeStatement(statement);
        queryLogger.info(EventType.STATEMENT_EXECUTION.getMarker(EventType.Stage.END), "Executed Statement");
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

    protected void setDateTimeValue(FuncParam funcParam, PreparedStatement statement, int parameterIndex) throws SQLException {
        if (funcParam.value == null) {
            statement.setNull(parameterIndex, java.sql.Types.TIMESTAMP);
            return;
        }
        Calendar calendar = javax.xml.bind.DatatypeConverter.parseDateTime((String)funcParam.value);
        calendar.setTimeZone(TimeZone.getTimeZone("UTC"));
        Timestamp ts = new Timestamp(calendar.getTime().getTime());
        statement.setTimestamp(parameterIndex, ts, Calendar.getInstance(TimeZone.getTimeZone("UTC")));
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
        if (param.value == null)
            statement.setNull(n, java.sql.Types.ARRAY);
        else {
            @SuppressWarnings (value="unchecked")
            ArrayList<String> values = (ArrayList<String>) param.value;
            Array array = statement.getConnection().createArrayOf("VARCHAR", values.toArray());
            statement.setArray(n, array);
        }
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
                queryLogger.debug("Executing batch mode...");
                String[] queries = query.replaceAll("\r\n", "\n").split(String.format("\n%sbatch\n|\n--batch\n", commentStart));
                for (String currentQuery : queries)
                    resultSet = executeQuery(currentQuery, queryRun, connection, timeout, queryLogger, fetchSize);
                queryLogger.debug("Executed batch mode");
            }

            return resultSet;
        } catch (SQLException e) {
            if (queryMonitor.checkCancelledId((String) queryRun.aux.get("mainCallId")))
                throw new QueryCancelledByUser();
            else throw e;
        }
    }
    public DataFrame getResultSetSubDf(FuncCall queryRun, ResultSet resultSet, ResultSetManager resultSetManager,
                                       int maxIterations, int columnCount, Logger queryLogger, int operationNumber,
                                       boolean dryRun) throws SQLException, QueryCancelledByUser {
        DataFrame dataFrame = new DataFrame();
        EventType resultSetProcessingEventType = dryRun ? EventType.RESULT_SET_PROCESSING_WITHOUT_DATAFRAME_FILL
                : EventType.RESULT_SET_PROCESSING_WITH_DATAFRAME_FILL;
        queryLogger.debug(resultSetProcessingEventType.getMarker(operationNumber, EventType.Stage.START),
                "Filling columns of DataFrame with id {}...", operationNumber);
        if (resultSet.next()) {
            int rowCount = 0;
            do {
                rowCount++;
                for (int c = 1; c < columnCount + 1; c++) {
                    Object value = getObjectFromResultSet(resultSet, c);

                    if (dryRun) continue;
                    resultSetManager.processValue(value, c, queryLogger);

                    if (queryMonitor.checkCancelledIdResultSet(queryRun.id)) {
                        queryLogger.info("Query was canceled");
                        queryMonitor.removeResultSet(queryRun.id);
                        throw new QueryCancelledByUser();
                    }
                }
            } while ((maxIterations < 0 || rowCount < maxIterations) && resultSet.next());

            queryLogger.debug(resultSetProcessingEventType.getMarker(operationNumber, EventType.Stage.END),
                    "Filled columns with {} rows of DataFrame with id {}", rowCount, operationNumber);
        }
        else
            queryLogger.debug(resultSetProcessingEventType.getMarker(operationNumber, EventType.Stage.END),
                    "Result set is empty");
        dataFrame.addColumns(resultSetManager.getProcessedColumns());
        return dataFrame;
    }

    public DataFrame execute(FuncCall queryRun) throws QueryCancelledByUser, GrokConnectException {
        try (Connection connection = getConnection(queryRun.func.connection);
                ResultSet resultSet = getResultSet(queryRun, connection, logger, 100)) {
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
            else throw new GrokConnectException(e);
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
        List<String> values = matcher.values;
        String value = null;
        if (values.size() > 0)
            value = values.get(0).toLowerCase();

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
            String sql = funcInfo.dbFunctionName.replaceAll("#", addBrackets(aggr.colName));
            return sql + " as " + addBrackets(funcInfo.dbFunctionName.replaceAll("#", aggr.colName));
        }
        else
            return null;
    }

    public String addBrackets(String name) {
        String brackets = descriptor.nameBrackets;
        return Arrays.stream(name.split("\\."))
                .map((str) -> str.startsWith(brackets.substring(0, 1)) ? str
                        : brackets.charAt(0) + str + brackets.substring(brackets.length() - 1))
                .collect(Collectors.joining("."));
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

    public DataFrame queryTable(DataConnection conn, TableQuery query) throws QueryCancelledByUser, GrokConnectException {
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
            setIfNotNull(properties, "user", conn.credentials.getLogin());
            setIfNotNull(properties, "password", conn.credentials.getPassword());
        }
        return properties;
    }

    public ResultSetManager getResultSetManager() {
        return DefaultResultSetManager.getDefaultManager();
    }

    public static void setIfNotNull(java.util.Properties properties, String key, String value) {
        if (value != null)
            properties.setProperty(key, value);
    }
}
