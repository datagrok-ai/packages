package grok_connect.providers;

import java.sql.*;
import java.util.*;
import java.util.stream.Collectors;
import grok_connect.connectors_info.DataConnection;
import grok_connect.connectors_info.DataQuery;
import grok_connect.connectors_info.DataSource;
import grok_connect.connectors_info.DbCredentials;
import grok_connect.connectors_info.FuncParam;
import grok_connect.table_query.AggrFunctionInfo;
import grok_connect.table_query.Stats;
import grok_connect.utils.GrokConnectException;
import grok_connect.utils.Property;
import serialization.Column;
import serialization.DataFrame;
import serialization.StringColumn;
import serialization.Types;

public class HiveDataProvider extends JdbcDataProvider {

    public HiveDataProvider() {
        driverClassName = "org.apache.hadoop.hive.jdbc.HiveDriver";

        descriptor = new DataSource();
        descriptor.type = "Hive";
        descriptor.description = "Query Hive database";
        descriptor.connectionTemplate = new ArrayList<>(DbCredentials.dbConnectionTemplate);
        descriptor.connectionTemplate.add(new Property(Property.BOOL_TYPE, DbCredentials.SSL));
        descriptor.credentialsTemplate = DbCredentials.dbCredentialsTemplate;
        descriptor.canBrowseSchema = true;
        descriptor.typesMap = new HashMap<String, String>() {{
            put("smallint", Types.INT);
            put("tinyint", Types.INT);
            put("int", Types.INT);
            put("bigint", Types.BIG_INT);
            put("boolean", Types.BOOL);
            put("double", Types.FLOAT);
            put("float", Types.FLOAT);
            put("#decimal.*", Types.FLOAT);
            put("date", Types.DATE_TIME);
            put("timestamp", Types.DATE_TIME);
            put("#char.*", Types.STRING);
            put("#varchar.*", Types.STRING);
            put("string", Types.STRING);
            put("#array.*", Types.OBJECT);
            put("#map.*", Types.OBJECT);
            put("#struct.*", Types.OBJECT);
        }};
        descriptor.aggregations.add(new AggrFunctionInfo(Stats.STDEV, "stddev(#)", Types.dataFrameNumericTypes));
    }

    @Override
    public Properties getProperties(DataConnection conn) {
        java.util.Properties properties = defaultConnectionProperties(conn);
        if (!conn.hasCustomConnectionString() && conn.ssl())
            properties.setProperty("ssl", "true");
        return properties;
    }

    @Override
    public String getConnectionStringImpl(DataConnection conn) {
        String port = (conn.getPort() == null) ? "" : ":" + conn.getPort();
        return "jdbc:hive://" + conn.getServer() + port + "/" + conn.getDb();
    }

    @Override
    public Connection getConnection(DataConnection conn) throws SQLException {
        return DriverManager.getConnection(getConnectionString(conn), getProperties(conn));
    }

    @Override
    public DataFrame getSchemas(DataConnection connection) throws GrokConnectException {
        try (Connection dbConnection = getConnection(connection);
             ResultSet schemas = dbConnection.getMetaData().getSchemas()) {
            DataFrame result = new DataFrame();
            Column tableSchemaColumn = new StringColumn();
            tableSchemaColumn.name = "table_schema";
            result.addColumn(tableSchemaColumn);
            while (schemas.next())
                result.addRow(schemas.getString(1));
            return result;
        } catch (SQLException e) {
            throw new GrokConnectException(e);
        }
    }

    @Override
    public DataFrame getSchema(DataConnection connection, String schema, String table) throws GrokConnectException {
        try (Connection dbConnection = getConnection(connection);
             ResultSet columns = dbConnection.getMetaData().getColumns(null, schema, table,
                     null)) {
            DataFrame result = new DataFrame();
            Column tableSchema = new StringColumn();
            tableSchema.name = "table_schema";
            Column tableNameColumn = new StringColumn();
            tableNameColumn.name = "table_name";
            Column columnName = new StringColumn();
            columnName.name = "column_name";
            Column dataType = new StringColumn();
            dataType.name = "data_type";
            result.addColumn(tableSchema);
            result.addColumn(tableNameColumn);
            result.addColumn(columnName);
            result.addColumn(dataType);
            while (columns.next())
                result.addRow(columns.getString(2), columns.getString(3),
                        columns.getString(4), columns.getString(6));
            return result;
        } catch (SQLException e) {
            throw new GrokConnectException(e);
        }
    }

    @Override
    protected String getRegexQuery(String columnName, String regexExpression) {
        return String.format("%s RLIKE '%s'", columnName, regexExpression);
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
    public void setDateTimeValue(FuncParam funcParam, PreparedStatement statement, int parameterIndex) {
        Calendar calendar = javax.xml.bind.DatatypeConverter.parseDateTime((String)funcParam.value);
        Timestamp ts = new Timestamp(calendar.getTime().getTime());
        try {
            statement.setTimestamp(parameterIndex, ts);
        } catch (SQLException e) {
            throw new RuntimeException(String.format("Something went wrong when setting datetime parameter at %s index",
                    parameterIndex), e);
        }
    }
}
