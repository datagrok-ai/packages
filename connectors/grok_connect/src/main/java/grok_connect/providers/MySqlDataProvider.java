package grok_connect.providers;

import java.sql.PreparedStatement;
import java.sql.SQLException;
import java.util.*;
import java.util.stream.Collectors;
import grok_connect.managers.ColumnManager;
import grok_connect.managers.bool_column.MySqlMssqlBoolColumnManager;
import grok_connect.connectors_info.*;
import grok_connect.resultset.DefaultResultSetManager;
import grok_connect.resultset.ResultSetManager;
import grok_connect.table_query.AggrFunctionInfo;
import grok_connect.table_query.Stats;
import grok_connect.utils.GrokConnectException;
import grok_connect.utils.Property;
import grok_connect.utils.QueryCancelledByUser;
import serialization.DataFrame;
import serialization.StringColumn;
import serialization.Types;

public class MySqlDataProvider extends JdbcDataProvider {

    public MySqlDataProvider() {
        driverClassName = "com.mysql.cj.jdbc.Driver";
        descriptor = new DataSource();
        descriptor.type = "MySQL";
        descriptor.description = "Query MySQL database";
        descriptor.connectionTemplate = new ArrayList<>(DbCredentials.dbConnectionTemplate);
        descriptor.connectionTemplate.add(new Property(Property.BOOL_TYPE, DbCredentials.SSL));
        descriptor.credentialsTemplate = DbCredentials.dbCredentialsTemplate;
        descriptor.canBrowseSchema = true;
        descriptor.nameBrackets = "`";
        descriptor.commentStart = "-- ";

        descriptor.typesMap = new HashMap<String, String>() {{
            put("bool", Types.BOOL);
            put("boolean", Types.BOOL);
            put("#bit(1)", Types.BOOL);
            put("#bit.*", Types.BIG_INT);
            put("#.*int", Types.INT);
            put("bigint", Types.BIG_INT);
            put("decimal", Types.FLOAT);
            put("float", Types.FLOAT);
            put("double", Types.FLOAT);
            put("double precision", Types.FLOAT);
            put("char", Types.STRING);
            put("varchar", Types.STRING);
            put("#.*text", Types.STRING);
            put("date", Types.DATE_TIME);
            put("datetime", Types.DATE_TIME);
            put("timestamp", Types.DATE_TIME);
            put("time", Types.DATE_TIME);
            put("year", Types.DATE_TIME);
            put("binary", Types.BLOB);
            put("varbinary", Types.BLOB);
            put("geometry", Types.OBJECT);
            put("point", Types.OBJECT);
            put("json", Types.OBJECT);
        }};
        descriptor.aggregations.add(new AggrFunctionInfo(Stats.STDEV, "std(#)", Types.dataFrameNumericTypes));
    }

    @Override
    public Properties getProperties(DataConnection conn) {
        java.util.Properties properties = defaultConnectionProperties(conn);
        if (!conn.hasCustomConnectionString()) {
            properties.setProperty("zeroDateTimeBehavior", "convertToNull");
            if (conn.ssl()) {
                properties.setProperty("useSSL", "true");
                properties.setProperty("verifyServerCertificate", "false");
            }
        }
        return properties;
    }

    @Override
    public String getConnectionStringImpl(DataConnection conn) {
        String port = (conn.getPort() == null) ? "" : ":" + conn.getPort();
        return "jdbc:mysql://" + conn.getServer() + port + "/" + conn.getDb();
    }

    @Override
    public DataFrame getSchemas(DataConnection connection) throws QueryCancelledByUser, GrokConnectException {
        String db = connection.getDb();
        StringColumn column = new StringColumn(new String[]{db});
        column.name = "TABLE_SCHEMA";
        DataFrame dataFrame = new DataFrame();
        dataFrame.addColumn(column);
        return dataFrame;
    }

    @Override
    public String getSchemaSql(String db, String schema, String table) {
        List<String> filters = new ArrayList<>();

        if (db != null && db.length() != 0)
            filters.add("c.table_schema = '" + db + "'");

        if (table != null)
            filters.add("(c.table_name = '" + table + "')");

        String whereClause = filters.size() != 0 ? "WHERE " + String.join(" AND \n", filters) : "";

        return "SELECT c.table_schema as table_schema, c.table_name as table_name, c.column_name as column_name, "
                + "c.data_type as data_type, "
                + "case t.table_type when 'VIEW' then 1 else 0 end as is_view FROM information_schema.columns c "
                + "JOIN information_schema.tables t ON t.table_name = c.table_name " + whereClause +
                " ORDER BY c.ORDINAL_POSITION;";
    }

    @Override
    protected String getRegexQuery(String columnName, String regexExpression) {
        return String.format("%s REGEXP '%s'", columnName, regexExpression);
    }

    @Override
    protected void appendQueryParam(DataQuery dataQuery, String paramName, StringBuilder queryBuffer) {
        FuncParam param = dataQuery.getParam(paramName);
        if (param.propertyType.equals("list")) {
            @SuppressWarnings("unchecked")
            List<String> values = ((ArrayList<String>) param.value);
            queryBuffer.append(values.stream().map(value -> "?").collect(Collectors.joining(", ")));
        } else {
            queryBuffer.append("?");
        }
    }

    @Override
    protected int setArrayParamValue(PreparedStatement statement, int n, FuncParam param) throws SQLException {
        @SuppressWarnings (value="unchecked")
        ArrayList<Object> lst = (ArrayList<Object>)param.value;
        if (lst == null || lst.size() == 0) {
            statement.setObject(n, null);
            return 0;
        }
        for (int i = 0; i < lst.size(); i++) {
            statement.setObject(n + i, lst.get(i));
        }
        return lst.size() - 1;
    }

    @Override
    public ResultSetManager getResultSetManager() {
        Map<String, ColumnManager<?>> defaultManagersMap = DefaultResultSetManager.getDefaultManagersMap();
        defaultManagersMap.put(Types.BOOL, new MySqlMssqlBoolColumnManager());
        return DefaultResultSetManager.fromManagersMap(defaultManagersMap);
    }
}
