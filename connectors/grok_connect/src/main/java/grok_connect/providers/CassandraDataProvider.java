package grok_connect.providers;

import java.sql.PreparedStatement;
import java.sql.SQLException;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Calendar;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Properties;

import grok_connect.connectors_info.DataConnection;
import grok_connect.connectors_info.DataQuery;
import grok_connect.connectors_info.DataSource;
import grok_connect.connectors_info.DbCredentials;
import grok_connect.connectors_info.FuncCall;
import grok_connect.connectors_info.FuncParam;
import grok_connect.managers.ColumnManager;
import grok_connect.managers.bigint_column.CassandraBigIntColumnManager;
import grok_connect.managers.integer_column.CassandraIntColumnManager;
import grok_connect.resultset.DefaultResultSetManager;
import grok_connect.resultset.ResultSetManager;
import grok_connect.table_query.AggrFunctionInfo;
import grok_connect.table_query.Stats;
import grok_connect.utils.*;
import serialization.DataFrame;
import serialization.StringColumn;
import serialization.Types;

public class CassandraDataProvider extends JdbcDataProvider {
    private static final String DEFAULT_EXCEPTION_MESSAGE = "Cassandra doesn't support this feature";
    private static final String NULL_MESSAGE = "Cassandra doesn't have explicit null type";

    public CassandraDataProvider() {
        driverClassName = "com.wisecoders.dbschema.cassandra.JdbcDriver";

        descriptor = new DataSource();
        descriptor.type = "Cassandra";
        descriptor.description = "Query Cassandra database";
        descriptor.connectionTemplate =  new ArrayList<Property>() {{
            add(new Property(Property.STRING_TYPE, DbCredentials.SERVER));
            add(new Property(Property.INT_TYPE, DbCredentials.PORT, new Prop()));
            add(new Property(Property.STRING_TYPE, DbCredentials.KEYSPACE));
            add(new Property(Property.STRING_TYPE, DbCredentials.CONNECTION_STRING,
                    DbCredentials.CONNECTION_STRING_DESCRIPTION, new Prop("textarea")));
            add(new Property(Property.BOOL_TYPE, DbCredentials.CACHE_SCHEMA));
            add(new Property(Property.BOOL_TYPE, DbCredentials.CACHE_RESULTS));
            add(new Property(Property.STRING_TYPE, DbCredentials.CACHE_INVALIDATE_SCHEDULE));
        }};
        descriptor.connectionTemplate.add(new Property(Property.BOOL_TYPE, DbCredentials.SSL));
        descriptor.credentialsTemplate = DbCredentials.dbCredentialsTemplate;
        descriptor.canBrowseSchema = true;
        descriptor.typesMap = new HashMap<String, String>() {{
            put("text", Types.STRING);
            put("duration", Types.STRING);
            put("uuid", Types.STRING);
            put("boolean", Types.BOOL);
            put("date", Types.DATE_TIME);
            put("timestamp", Types.DATE_TIME);
            put("time", Types.DATE_TIME);
            put("bigint", Types.BIG_INT);
            put("varint", Types.BIG_INT);
            put("int", Types.INT);
            put("smallint", Types.INT);
            put("tinyint", Types.INT);
            put("decimal", Types.FLOAT);
            put("float", Types.FLOAT);
            put("double", Types.FLOAT);
            put("#frozen.*", Types.OBJECT);
            put("#list.*", Types.OBJECT);
            put("#map.*", Types.OBJECT);
            put("#set.*", Types.OBJECT);
            put("inet", Types.OBJECT);
            put("blob", Types.BLOB);
        }};
        descriptor.aggregations = new ArrayList<AggrFunctionInfo>() {{
            add(new AggrFunctionInfo(Stats.AVG, "avg(#)", Types.dataFrameNumericTypes));
            add(new AggrFunctionInfo(Stats.MIN, "min(#)", Types.dataFrameNumericTypes));
            add(new AggrFunctionInfo(Stats.MAX, "max(#)", Types.dataFrameNumericTypes));
            add(new AggrFunctionInfo(Stats.SUM, "sum(#)", Types.dataFrameNumericTypes));
            add(new AggrFunctionInfo(Stats.TOTAL_COUNT, "count(*)", Types.dataFrameColumnTypes));
            add(new AggrFunctionInfo(Stats.VALUE_COUNT, "count(#)", Types.dataFrameNumericTypes));
        }};
    }

    @Override
    public Properties getProperties(DataConnection conn)  {
        java.util.Properties properties = defaultConnectionProperties(conn);
        if (!conn.hasCustomConnectionString() && conn.ssl()) {
            properties.put("sslenabled", "true");
        }
        return properties;
    }

    @Override
    public String getConnectionStringImpl(DataConnection conn) {
        String port = (conn.getPort() == null) ? "" : ":" + conn.getPort();
        String keySpace = conn.get(DbCredentials.KEYSPACE);
        return String.format("jdbc:cassandra://%s%s%s", conn.getServer(), port,
                GrokConnectUtil.isEmpty(keySpace) ? "" : String.format("/%s", keySpace));
    }

    @Override
    public String getSchemasSql(String db) {
        return "SELECT keyspace_name as table_schema from system_schema.keyspaces";
    }

    @Override
    public DataFrame getSchemas(DataConnection connection) throws QueryCancelledByUser, GrokConnectException {
        String db = connection.get(DbCredentials.KEYSPACE);
        if (GrokConnectUtil.isNotEmpty(db)) {
            StringColumn column = new StringColumn(new String[]{db});
            column.name = "TABLE_SCHEMA";
            DataFrame dataFrame = new DataFrame();
            dataFrame.addColumn(column);
            return dataFrame;
        }
        return super.getSchemas(connection);
    }

    @Override
    public DataFrame getSchema(DataConnection connection, String schema, String table)
            throws QueryCancelledByUser, GrokConnectException {
        FuncCall queryRun = new FuncCall();
        queryRun.func = new DataQuery();
        queryRun.func.query = getSchemaSql(connection.get(DbCredentials.KEYSPACE), schema, table);
        queryRun.func.connection = connection;
        return execute(queryRun);
    }

    @Override
    public String getSchemaSql(String db, String schema, String table) {
        String keySpace = GrokConnectUtil.isEmpty(db) ? schema : db;
        boolean isEmptyKeySpace = GrokConnectUtil.isEmpty(keySpace);
        boolean isEmptyTable = GrokConnectUtil.isEmpty(table);
        String whereClause = String.format(" where%s%s",
                isEmptyKeySpace ? "" : String.format(" keyspace_name = '%s'", keySpace),
                isEmptyTable ? "" : String.format("%s table_name = '%s'", isEmptyKeySpace ? "" : " and", table));
        return String.format("select keyspace_name as table_schema, table_name,  column_name, type as data_type "
                + "from system_schema.columns%s;", isEmptyKeySpace && isEmptyTable ? "" : whereClause );
    }

    @Override
    public PatternMatcherResult stringPatternConverter(FuncParam param, PatternMatcher matcher) {
        PatternMatcherResult result = new PatternMatcherResult();
        String type = "string";
        String _query = matcher.colName +  " LIKE @" + param.name;
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
                throw new UnsupportedOperationException(NULL_MESSAGE);
            default:
                throw new UnsupportedOperationException(DEFAULT_EXCEPTION_MESSAGE);
        }

        return result;
    }

    @Override
    public PatternMatcherResult numericPatternConverter(FuncParam param, PatternMatcher matcher) {
        PatternMatcherResult result = new PatternMatcherResult();
        String type = param.options.get("pattern");
        switch (matcher.op) {
            case PatternMatcher.NONE:
                result.query = "1 = 1";
                break;
            case PatternMatcher.RANGE_NUM:
                String name0 = param.name + "R0";
                String name1 = param.name + "R1";
                result.query = matcher.colName + " >= @" + name0 + " AND " + matcher.colName + " <= @" + name1;
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
                throw new UnsupportedOperationException(NULL_MESSAGE);
            default:
                result.query = matcher.colName + " " + matcher.op + " @" + param.name;
                result.params.add(new FuncParam(type, param.name, matcher.values.get(0)));
                break;
        }
        return result;
    }

    @Override
    public PatternMatcherResult dateTimePatternConverter(FuncParam param, PatternMatcher matcher) {
        PatternMatcherResult result = new PatternMatcherResult();

        switch (matcher.op) {
            case PatternMatcher.EQUALS:
                result.query = matcher.colName + " = @" + param.name;
                result.params.add(new FuncParam("datetime", param.name, matcher.values.get(0)));
                break;
            case PatternMatcher.BEFORE:
            case PatternMatcher.AFTER:
                result.query = matcher.colName + PatternMatcher.cmp(matcher.op, matcher.include1) + "@" + param.name;
                result.params.add(new FuncParam("datetime", param.name, matcher.values.get(0)));
                break;
            case PatternMatcher.RANGE_DATE_TIME:
                String name0 = param.name + "R0";
                String name1 = param.name + "R1";
                result.query = matcher.colName + PatternMatcher.cmp(PatternMatcher.AFTER, matcher.include1) + "@" + name0 + " AND " +
                        matcher.colName + PatternMatcher.cmp(PatternMatcher.BEFORE, matcher.include2) + "@" + name1;
                result.params.add(new FuncParam("datetime", name0, matcher.values.get(0)));
                result.params.add(new FuncParam("datetime", name1, matcher.values.get(1)));
                break;
            case PatternMatcher.IS_NULL:
            case PatternMatcher.IS_NOT_NULL:
                throw new UnsupportedOperationException(NULL_MESSAGE);
            default:
                throw new UnsupportedOperationException(DEFAULT_EXCEPTION_MESSAGE);
        }

        return result;
    }

    @Override
    protected void setDateTimeValue(FuncParam funcParam, PreparedStatement statement, int parameterIndex) {
        Calendar calendar = javax.xml.bind.DatatypeConverter.parseDateTime((String)funcParam.value);
        LocalDateTime localDateTime = LocalDateTime.ofInstant(calendar.toInstant(), calendar.getTimeZone().toZoneId());
        try {
            statement.setObject(parameterIndex, localDateTime.toLocalDate());
        } catch (SQLException e) {
            throw new RuntimeException(String.format("Something went wrong when setting datetime parameter at %s index",
                    parameterIndex), e);
        }
    }

    @Override
    public ResultSetManager getResultSetManager() {
        Map<String, ColumnManager<?>> defaultManagersMap = DefaultResultSetManager.getDefaultManagersMap();
        defaultManagersMap.put(Types.BIG_INT, new CassandraBigIntColumnManager());
        defaultManagersMap.put(Types.INT, new CassandraIntColumnManager());
        return DefaultResultSetManager.fromManagersMap(defaultManagersMap);
    }
}
