package grok_connect.providers;

import java.sql.PreparedStatement;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Properties;
import java.util.stream.Collectors;
import grok_connect.connectors_info.DataConnection;
import grok_connect.connectors_info.DataQuery;
import grok_connect.connectors_info.DataSource;
import grok_connect.connectors_info.DbCredentials;
import grok_connect.connectors_info.FuncParam;
import grok_connect.utils.GrokConnectException;
import grok_connect.utils.Property;
import grok_connect.utils.QueryCancelledByUser;
import serialization.Column;
import serialization.DataFrame;
import serialization.IntColumn;
import serialization.Types;

public class VerticaDataProvider extends JdbcDataProvider {
    public VerticaDataProvider() {
        driverClassName = "com.vertica.jdbc.Driver";

        descriptor = new DataSource();
        descriptor.type = "Vertica";
        descriptor.description = "Query Vertica database";
        descriptor.connectionTemplate = new ArrayList<>(DbCredentials.dbConnectionTemplate);
        descriptor.connectionTemplate.add(new Property(Property.BOOL_TYPE, DbCredentials.SSL));
        descriptor.credentialsTemplate = DbCredentials.dbCredentialsTemplate;
        descriptor.canBrowseSchema = true;
        descriptor.typesMap = new HashMap<String, String>() {{
            put("#.*char.*", Types.STRING);
            put("boolean", Types.BOOL);
            put("date", Types.DATE_TIME);
            put("#timestamp.*", Types.DATE_TIME);
            put("#time.*", Types.DATE_TIME);
            put("#interval.*", Types.STRING);
            put("int", Types.BIG_INT);
            put("#numeric.*", Types.FLOAT);
            put("float", Types.FLOAT);
            put("#geometry.*", Types.OBJECT);
            put("#geography.*", Types.OBJECT);
            put("uuid", Types.STRING);
        }};
    }

    @Override
    public Properties getProperties(DataConnection conn) {
        java.util.Properties properties = defaultConnectionProperties(conn);
        if (!conn.hasCustomConnectionString() && conn.ssl())
            properties.setProperty("SSL", "true");
        return properties;
    }

    @Override
    public String getConnectionStringImpl(DataConnection conn) {
        String port = (conn.getPort() == null) ? "" : ":" + conn.getPort();
        return "jdbc:vertica://" + conn.getServer() + port + "/" + conn.getDb();
    }

    @Override
    public String getSchemasSql(String db) {
        return "SELECT DISTINCT schema_name as table_schema FROM v_catalog.schemata;";
    }

    @Override
    public String getSchemaSql(String db, String schema, String table) {
        String whereClause = String.format(" WHERE%s%s",
                schema == null ? "" : String.format(" c.table_schema = '%s'", schema),
                table == null ? "" : String.format("%s c.table_name = '%s'", schema == null ? "" : " AND", table));
        return String.format("SELECT c.table_schema as table_schema, c.table_name as table_name, c.column_name as column_name, \n"
                + "c.data_type as data_type, case t.table_type when 'VIEW' then 1 else 0 end as is_view \n"
                + "FROM v_catalog.columns c \n"
                + "JOIN v_catalog.all_tables t ON t.table_name = c.table_name%s UNION ALL "
                + "SELECT c.table_schema as table_schema, c.table_name as table_name, c.column_name as column_name, "
                + "c.data_type as data_type, case t.table_type when 'VIEW' then 1 else 0 end as is_view "
                + "FROM v_catalog.view_columns c JOIN v_catalog.all_tables t ON t.table_name = c.table_name%s;", schema == null && table == null ? "" : whereClause,
                schema == null && table == null ? "" : whereClause);
    }

    /**
     * Vertica doesn't have a 32-bit integers, so is_view column is BigInt.
     * Replace it with InColumn for easy handle in next steps
     */
    @Override
    public DataFrame getSchema(DataConnection connection, String schema, String table) throws QueryCancelledByUser,
            GrokConnectException {
        String columnName = "is_view";
        DataFrame dataFrame = super.getSchema(connection, schema, table);
        Column oldColumn = dataFrame.columns.stream()
                .filter(column -> column.name.equals(columnName))
                .collect(Collectors.toList()).get(0);
        dataFrame.columns.remove(oldColumn);
        Column newColumn = new IntColumn();
        for (int i = 0; i< oldColumn.length; i++)
            newColumn.add(Integer.valueOf(oldColumn.get(i).toString()));
        newColumn.name = columnName;
        dataFrame.columns.add(newColumn);
        return dataFrame;
    }

    @Override
    protected String getRegexQuery(String columnName, String regexExpression) {
        return String.format("REGEXP_LIKE(%s, '%s')", columnName, regexExpression);
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
}
