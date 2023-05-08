package grok_connect.providers;

import java.io.*;
import java.sql.*;
import java.util.*;
import java.math.*;
import java.text.*;
import java.util.regex.*;

import grok_connect.resultset.DefaultResultSetManager;
import grok_connect.resultset.ResultSetManager;
import org.apache.commons.lang.NotImplementedException;
import org.apache.commons.text.StringEscapeUtils;
import org.joda.time.DateTime;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import serialization.*;
import grok_connect.utils.*;
import grok_connect.table_query.*;
import grok_connect.connectors_info.*;
import serialization.Types;

public abstract class JdbcDataProvider extends DataProvider {
    protected ResultSetManager resultSetManager;
    protected Logger logger = LoggerFactory.getLogger(this.getClass().getName());
    protected String driverClassName;
    protected QueryMonitor queryMonitor = QueryMonitor.getInstance();

    public JdbcDataProvider() {
        resultSetManager = DefaultResultSetManager.getDefaultManager();
    }

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

    public ResultSet executeQuery(String query, FuncCall queryRun, Connection connection, int timeout)  throws ClassNotFoundException, SQLException {
        boolean supportsTransactions = connection.getMetaData().supportsTransactions();
        logger.debug("supports Transactions: {}", supportsTransactions);
        if (supportsTransactions)
            connection.setAutoCommit(false);

        DataQuery dataQuery = queryRun.func;
        String mainCallId = (String) queryRun.aux.get("mainCallId");
        int fetchSize = (queryRun.aux.containsKey("fetchSize") && (queryRun.aux.get("fetchSize").equals("big"))) ? 10000 : 100;

        ResultSet resultSet = null;
        if (dataQuery.inputParamsCount() > 0) {
            query = convertPatternParamsToQueryParams(queryRun, query);

            if (autoInterpolation()) {
                logger.debug("Autointerpolating query");
                StringBuilder queryBuffer = new StringBuilder();
                List<String> names = getParameterNames(query, dataQuery, queryBuffer);
                query = queryBuffer.toString();
                System.out.println(query);
                PreparedStatement statement = connection.prepareStatement(query);
                if (supportsTransactions)
                    statement.setFetchSize(fetchSize);
                queryMonitor.addNewStatement(mainCallId, statement);
                List<String> stringValues = new ArrayList<>();
                System.out.println(names);
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
                        if (param.value == null)
                            stringValue = "null";
                        else
                            stringValue = param.value.toString();
                        statement.setObject(n + i + 1, param.value);
                    }
                    stringValues.add(stringValue);
                }
                statement.setQueryTimeout(timeout);
                String logString = String.format("Query: %s; \nParams array: %s \n", statement, stringValues);
                logger.debug(logString);
                if (queryRun.debugQuery)
                    queryRun.log += logString;
                if(statement.execute())
                    resultSet = statement.getResultSet();
                queryMonitor.removeStatement(mainCallId);
            } else {
                query = manualQueryInterpolation(query, dataQuery);

                Statement statement = connection.createStatement();
                if (supportsTransactions)
                    statement.setFetchSize(fetchSize);
                queryMonitor.addNewStatement(mainCallId, statement);
                statement.setQueryTimeout(timeout);
                String logString = String.format("Query: %s \n", query);
                logger.debug(logString);
                if (queryRun.debugQuery)
                    queryRun.log += logString;
                if(statement.execute(query))
                    resultSet = statement.getResultSet();
                queryMonitor.removeStatement(mainCallId);
            }
        } else {
            // Query without parameters
            Statement statement = connection.createStatement();
            if (supportsTransactions)
                statement.setFetchSize(fetchSize);
            queryMonitor.addNewStatement(mainCallId, statement);
            statement.setQueryTimeout(timeout);
            String logString = String.format("Query: %s \n", query);
            logger.debug(logString);
            if (queryRun.debugQuery)
                queryRun.log += logString;
            if(statement.execute(query))
                resultSet = statement.getResultSet();
            queryMonitor.removeStatement(mainCallId);
        }

        return resultSet;
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
        Pattern pattern = Pattern.compile("(?m)@(\\w+)");
        List<String> names = new ArrayList<>();
        Matcher matcher = pattern.matcher(query);
        int idx = 0;
        while (matcher.find()) {
            String name = matcher.group(1);
            if (dataQuery.existsParam(name)) {
                queryBuffer.append(query, idx, matcher.start());
                appendQueryParam(dataQuery, name, queryBuffer);
                idx = matcher.end();
                if (!names.contains(name)) {
                    names.add(name);
                }
            }
        }
        queryBuffer.append(query, idx, query.length());
        return names;
    }

    protected void appendQueryParam(DataQuery dataQuery, String paramName, StringBuilder queryBuffer) {
        queryBuffer.append("?");
    }

    public ResultSet getResultSet(FuncCall queryRun, Connection connection) throws ClassNotFoundException, GrokConnectException, QueryCancelledByUser, SQLException {
        logger.debug("resultSetScheme was called");
        Integer providerTimeout = getTimeout();
        int timeout = providerTimeout != null ? providerTimeout : (queryRun.options != null && queryRun.options.containsKey(DataProvider.QUERY_TIMEOUT_SEC))
                ? ((Double)queryRun.options.get(DataProvider.QUERY_TIMEOUT_SEC)).intValue() : 300;

        try {
            // Remove header lines
            DataQuery dataQuery = queryRun.func;
            String query = dataQuery.query;
            String commentStart = descriptor.commentStart;

            ResultSet resultSet = null;

            DateTime queryExecutionStart = DateTime.now();

            if (!(queryRun.func.options != null
                    && queryRun.func.options.containsKey("batchMode")
                    && queryRun.func.options.get("batchMode").equals("true"))) {
                query = query.replaceAll("(?m)^" + commentStart + ".*\\n", "");
                System.out.println(query);
                resultSet = executeQuery(query, queryRun, connection, timeout);
            } else {
                String[] queries = query.replaceAll("\r\n", "\n").split("\n--batch\n");

                for (String currentQuery : queries)
                    resultSet = executeQuery(currentQuery, queryRun, connection, timeout); // IT WON'T WORK?
            }

            return resultSet;
        } catch (SQLException e) {
            if (queryMonitor.checkCancelledId((String) queryRun.aux.get("mainCallId")))
                throw new QueryCancelledByUser();
            else throw e;
        }
    }

    public DataFrame getResultSetSubDf(FuncCall queryRun, ResultSet resultSet, List<Column> columns,
            List<Boolean> supportedType,List<Boolean> initColumn) throws IOException, SQLException, QueryCancelledByUser {
        return getResultSetSubDf(queryRun, resultSet, columns, supportedType, initColumn, 10000);
    }

    public SchemeInfo resultSetScheme(FuncCall queryRun, ResultSet resultSet) throws QueryCancelledByUser, SQLException {
        logger.debug("resultSetScheme was called");
        try {
            // if (resultSet == null)
            //     return new DataFrame();

            ResultSetMetaData resultSetMetaData = resultSet.getMetaData();

            int columnCount = resultSetMetaData.getColumnCount();
            List<Column> columns = new ArrayList<>(columnCount);
            List<Boolean> supportedType = new ArrayList<>(columnCount);
            List<Boolean> initColumn = new ArrayList<>(columnCount);
            StringBuilder logBuilder = new StringBuilder();
            for (int c = 1; c < columnCount + 1; c++) {
                Column column;
                String label = resultSetMetaData.getColumnLabel(c);
                int type = resultSetMetaData.getColumnType(c);
                String typeName = resultSetMetaData.getColumnTypeName(c);
                supportedType.add(c - 1, true);
                initColumn.add(c - 1, true);

                int precision = resultSetMetaData.getPrecision(c);
                int scale = resultSetMetaData.getScale(c);

                String logString1 = String.format("Column: %s, type: %d, type name: %s, precision: %d, scale: %d \n",
                        label, type, typeName, precision, scale);
                logBuilder.append(logString1);
                logger.debug(logString1);
                column = resultSetManager.getColumn(type, typeName, precision, scale);
                String logString2 = String.format("Java type: %s \n", column.getClass().getName());
                logBuilder.append(logString2);
                logger.debug(logString2);
                column.name = label;
                columns.add(c - 1, column);
            }
            if (queryRun.debugQuery) {
                queryRun.log += logBuilder.toString();
            }
            return new SchemeInfo(columns, supportedType, initColumn);

        } catch (SQLException e) {
            logger.warn("An exception was thrown", e);
            if (queryMonitor.checkCancelledId((String) queryRun.aux.get("mainCallId")))
                throw new QueryCancelledByUser();
            else throw e;
        }
    }

    public DataFrame getResultSetSubDf(FuncCall queryRun, ResultSet resultSet, List<Column> columns,
                                       List<Boolean> supportedType,List<Boolean> initColumn, int maxIterations)
            throws IOException, SQLException, QueryCancelledByUser {
        logger.debug("getResultSetSubDf was called");
        if (queryMonitor.checkCancelledId((String) queryRun.aux.get("mainCallId"))) {
            logger.debug("Query was cancelled: \"{}\"", queryRun.func.query);
            throw new QueryCancelledByUser();
        }

        int count = (queryRun.options != null && queryRun.options.containsKey(DataProvider.QUERY_COUNT))
                ? ((Double)queryRun.options.get(DataProvider.QUERY_COUNT)).intValue() : 0;
        int memoryLimit = (queryRun.options != null && queryRun.options.containsKey(DataProvider.QUERY_MEMORY_LIMIT_MB))
                ? ((Double)queryRun.options.get(DataProvider.QUERY_MEMORY_LIMIT_MB)).intValue() : 0;
        try {
            int columnCount = columns.size();

            if (resultSet == null)
                return new DataFrame();

            ResultSetMetaData resultSetMetaData = resultSet.getMetaData();
            logger.debug("Received resultSet meta data");
            DateTime fillingDataframeStart = DateTime.now();
            BufferedWriter csvWriter = null;
            if (outputCsv != null) {
                csvWriter = new BufferedWriter(new FileWriter(outputCsv));

                for (int c = 1; c < columnCount + 1; c++) {
                    csvWriter.append(resultSetMetaData.getColumnLabel(c));
                    csvWriter.append(c == columnCount ? '\n' : ',');
                }
            }

            int rowCount = 0;
            List<DebugUtils.NumericColumnStats> numericColumnStats = new ArrayList<>();
            for (int i = 0; i < columnCount; i++)
                numericColumnStats.add(new DebugUtils.NumericColumnStats());

            int size = 0;
            while ((maxIterations < 0 || rowCount < maxIterations) && resultSet.next() && (size < 100)  ) {
                rowCount++;

                for (int c = 1; c < columnCount + 1; c++) {
                    Object value = getObjectFromResultSet(resultSet, c);

                    if (queryRun.debugQuery && value != null)
                        numericColumnStats.get(c-1).updateStats(value);

                    if (outputCsv != null) {
                        if (value != null)
                            csvWriter.append(StringEscapeUtils.escapeCsv(value.toString()));

                        csvWriter.append(c == columnCount ? '\n' : ',');
                    }
                    int type = resultSetMetaData.getColumnType(c);
                    String typeName = resultSetMetaData.getColumnTypeName(c);
                    int precision = resultSetMetaData.getPrecision(c);
                    int scale = resultSetMetaData.getScale(c);
                    String columnLabel = resultSetMetaData.getColumnLabel(c);
                    columns.get(c - 1).add(resultSetManager
                            .convert(value, type, typeName, precision, scale, columnLabel));
                    }
                }

                if (rowCount % 10 == 0) {
                    if (queryMonitor.checkCancelledIdResultSet(queryRun.id)) {
                        DataFrame dataFrame = new DataFrame();
                        dataFrame.addColumns(columns);

                        resultSet.close();
                        queryMonitor.removeResultSet(queryRun.id);
                        return dataFrame;
                    }
                    if (rowCount % 100 == 0) {
                        size = 0;
                        for (Column column : columns)
                            size += column.memoryInBytes();
                        size = ((count > 0) ? (int)((long)count * size / rowCount) : size) / 1000000; // count? it's 200 lines up

                        if (size > 5) {
                            DataFrame dataFrame = new DataFrame();
                            dataFrame.addColumns(columns);
                            return dataFrame;
                        }

                        if (rowCount % 1000 == 0 && memoryLimit > 0 && size > memoryLimit)
                            throw new SQLException("Too large query result: " +
                                size + " > " + memoryLimit + " MB");
                    }
                }
            if (queryRun.debugQuery) {
                StringBuilder logBuilder = new StringBuilder();
                for (int i = 0; i < columnCount; i++) {
                    if (!numericColumnStats.get(i).valuesCounter.equals(new BigDecimal(0))) {
                        String logString = String.format("Column: %s, min: %s, max: %s, mean: %s\n", columns.get(i).name, numericColumnStats.get(i).min, numericColumnStats.get(i).max, numericColumnStats.get(i).mean);
                        logBuilder.append(logString);
                        logger.debug(logString);
                    }
                }
                queryRun.log += logBuilder.toString();
            }
            DateTime finish = DateTime.now();

            String logString = String.format(" dataframe filling: %s s \n",
                    (finish.getMillis() - fillingDataframeStart.getMillis())/ 1000.0);
            if (queryRun.debugQuery)
                queryRun.log += logString;
            logger.debug(logString);
            if (outputCsv != null) {
                csvWriter.close();
            }
            DataFrame dataFrame = new DataFrame();
            dataFrame.addColumns(columns);
            return dataFrame;
        } catch (Exception e) {
            logger.warn("An exception was thrown", e);
            if (resultSet != null && resultSet.isClosed()) {
                throw new QueryCancelledByUser();
            }
            else {
                throw e;
            }
        }
    }

    public DataFrame execute(FuncCall queryRun)
            throws ClassNotFoundException, SQLException, ParseException, IOException, QueryCancelledByUser, GrokConnectException {
        Connection connection = null;
        try {
            connection = getConnection(queryRun.func.connection);
            ResultSet resultSet = getResultSet(queryRun, connection);

            if (resultSet == null)
                return new DataFrame();

            SchemeInfo schemeInfo = resultSetScheme(queryRun, resultSet);
            return getResultSetSubDf(queryRun, resultSet, schemeInfo.columns, schemeInfo.supportedType, schemeInfo.initColumn, -1);
        }
        catch (SQLException e) {
            if (queryMonitor.checkCancelledId((String) queryRun.aux.get("mainCallId")))
                throw new QueryCancelledByUser();
            else throw e;
        }
        finally {
            if (connection != null)
                connection.close();
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
        if (matcher.op.equals(PatternMatcher.NONE))
            result.query = "(1 = 1)";
        else if (matcher.op.equals(PatternMatcher.RANGE_NUM)) {
            String name0 = param.name + "R0";
            String name1 = param.name + "R1";
            result.query = "(" + matcher.colName + " >= @" + name0 + " AND " + matcher.colName + " <= @" + name1 + ")";
            result.params.add(new FuncParam(type, name0, matcher.values.get(0)));
            result.params.add(new FuncParam(type, name1, matcher.values.get(1)));
        } else if (matcher.op.equals(PatternMatcher.IN) || matcher.op.equals(PatternMatcher.NOT_IN)) {
            String names = paramToNamesString(param, matcher, type, result);
            result.query = getInQuery(matcher, names);
        } else {
            result.query = "(" + matcher.colName + " " + matcher.op + " @" + param.name + ")";
            result.params.add(new FuncParam(type, param.name, matcher.values.get(0)));
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
        String value = ((String)matcher.values.get(0)).toLowerCase();

        if (matcher.op.equals(PatternMatcher.EQUALS)) {
            result.query = _query;
            result.params.add(new FuncParam(type, param.name, value));
        } else if (matcher.op.equals(PatternMatcher.CONTAINS)) {
            result.query = _query;
            result.params.add(new FuncParam(type, param.name, "%" + value + "%"));
        } else if (matcher.op.equals(PatternMatcher.STARTS_WITH)) {
            result.query = _query;
            result.params.add(new FuncParam(type, param.name, value + "%"));
        } else if (matcher.op.equals(PatternMatcher.ENDS_WITH)) {
            result.query = _query;
            result.params.add(new FuncParam(type, param.name, "%" + value));
        } else if (matcher.op.equals(PatternMatcher.REGEXP)) {
            result.query = getRegexQuery(matcher.colName, value);
            result.params.add(new FuncParam(type, param.name, value));
        } else if (matcher.op.equals(PatternMatcher.IN) || matcher.op.equals(PatternMatcher.NOT_IN)) {
            String names = paramToNamesString(param, matcher, type, result);
            result.query = getInQuery(matcher, names);
        } else {
            result.query = "(1 = 1)";
        }

        return result;
    }

    protected String getRegexQuery(String columnName, String regexExpression) {
        throw new UnsupportedOperationException("REGEXP is not supported for this provider");
    }

    public PatternMatcherResult dateTimePatternConverter(FuncParam param, PatternMatcher matcher) {
        PatternMatcherResult result = new PatternMatcherResult();

        if (matcher.op.equals(PatternMatcher.NONE)) {
            result.query = "(1 = 1)";
        } else if (matcher.op.equals(PatternMatcher.EQUALS)) {
            result.query = "(" + matcher.colName + " = @" + param.name + ")";
            result.params.add(new FuncParam("datetime", param.name, matcher.values.get(0)));
        } else if (matcher.op.equals(PatternMatcher.BEFORE) || matcher.op.equals(PatternMatcher.AFTER)) {
            result.query = "(" + matcher.colName + PatternMatcher.cmp(matcher.op, matcher.include1) + "@" + param.name + ")";
            result.params.add(new FuncParam("datetime", param.name, matcher.values.get(0)));
        } else if (matcher.op.equals(PatternMatcher.RANGE_DATE_TIME)) {
            String name0 = param.name + "R0";
            String name1 = param.name + "R1";
            result.query = "(" + matcher.colName + PatternMatcher.cmp(PatternMatcher.AFTER, matcher.include1) + "@" + name0 + " AND " +
                    matcher.colName + PatternMatcher.cmp(PatternMatcher.BEFORE, matcher.include2) + "@" + name1 + ")";
            result.params.add(new FuncParam("datetime", name0, matcher.values.get(0)));
            result.params.add(new FuncParam("datetime", name1, matcher.values.get(1)));
        } else {
            result.query = "(1 = 1)";
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
        System.out.println(sql);
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
}
