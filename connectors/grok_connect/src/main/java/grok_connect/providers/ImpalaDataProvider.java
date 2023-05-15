package grok_connect.providers;

import java.io.IOException;
import java.sql.PreparedStatement;
import java.sql.SQLException;
import java.text.ParseException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.Properties;
import grok_connect.connectors_info.DataConnection;
import grok_connect.connectors_info.DataQuery;
import grok_connect.connectors_info.DataSource;
import grok_connect.connectors_info.DbCredentials;
import grok_connect.connectors_info.FuncCall;
import grok_connect.connectors_info.FuncParam;
import grok_connect.utils.GrokConnectException;
import grok_connect.utils.Prop;
import grok_connect.utils.Property;
import grok_connect.utils.ProviderManager;
import grok_connect.utils.QueryCancelledByUser;
import serialization.Column;
import serialization.DataFrame;
import serialization.StringColumn;
import serialization.Types;

public class ImpalaDataProvider extends JdbcDataProvider {
    public ImpalaDataProvider(ProviderManager providerManager) {
        super(providerManager);
        driverClassName = "com.cloudera.impala.jdbc.Driver";

        descriptor = new DataSource();
        descriptor.type = "Impala";
        descriptor.description = "Query Impala database";
        descriptor.defaultSchema = "default";
        descriptor.canBrowseSchema = true;
        descriptor.connectionTemplate = new ArrayList<Property>() {{
            add(new Property(Property.STRING_TYPE, DbCredentials.SERVER));
            add(new Property(Property.INT_TYPE, DbCredentials.PORT, new Prop()));
            add(new Property(Property.STRING_TYPE, DbCredentials.SCHEMA, "If not specified schema "
                    + "'default' will be used"));
            add(new Property(Property.STRING_TYPE, DbCredentials.CONNECTION_STRING,
                    DbCredentials.CONNECTION_STRING_DESCRIPTION, new Prop("textarea")));
            add(new Property(Property.BOOL_TYPE, DbCredentials.CACHE_SCHEMA));
            add(new Property(Property.BOOL_TYPE, DbCredentials.CACHE_RESULTS));
            add(new Property(Property.STRING_TYPE, DbCredentials.CACHE_INVALIDATE_SCHEDULE));
        }};
        descriptor.credentialsTemplate = DbCredentials.dbCredentialsTemplate;
        descriptor.typesMap = new HashMap<String, String>() {{
            put("#.*char.*", Types.STRING);
            put("string", Types.STRING);
            put("boolean", Types.BOOL);
            put("date", Types.DATE_TIME);
            put("#timestamp.*", Types.DATE_TIME);
            put("int", Types.INT);
            put("smallint", Types.INT);
            put("tinyint", Types.INT);
            put("bigint", Types.BIG_INT);
            put("#decimal.*", Types.FLOAT);
            put("float", Types.FLOAT);
            put("double", Types.FLOAT);
            put("#array.*", Types.OBJECT);
            put("#struct.*", Types.OBJECT);
            put("#map.*", Types.OBJECT);
            put("#binary.*", Types.BLOB);
        }};
    }

    @Override
    protected void appendQueryParam(DataQuery dataQuery, String paramName, StringBuilder queryBuffer) {
        //if list -- append all items
        FuncParam param = dataQuery.getParam(paramName);
        if (param.propertyType.equals(Types.LIST)) {
            if (param.value == null) {
                queryBuffer.append("?");
                return;
            }
            @SuppressWarnings (value="unchecked")
            ArrayList<Object> lst = (ArrayList<Object>)param.value;
            int size = lst.size();
            if (size == 0) {
                queryBuffer.append("?");
                return;
            }
            for (int i = 0; i < size; i++) {
                queryBuffer.append("?");
                if (i < size - 1)
                    queryBuffer.append(",");
            }
        } else {
            queryBuffer.append("?");
        }
    }

    @Override
    public String getSchemasSql(String db) {
        return "SHOW SCHEMAS;";
    }

    @Override
    public DataFrame getSchemas(DataConnection connection) throws ClassNotFoundException, SQLException, ParseException, IOException, QueryCancelledByUser, GrokConnectException {
        String schema = connection.get(DbCredentials.SCHEMA);
        String columnName = "TABLE_SCHEMA";
        if (schema != null && !schema.isEmpty()) {
            StringColumn column = new StringColumn(new String[]{schema});
            column.name = columnName;
            DataFrame dataFrame = new DataFrame();
            dataFrame.addColumn(column);
            return dataFrame;
        }
        DataFrame dataFrame = super.getSchemas(connection);
        dataFrame.columns.removeIf(column -> column.name.equalsIgnoreCase("comment"));
        dataFrame.columns.get(0).name = columnName;
        return dataFrame;
    }

    @Override
    public DataFrame getSchema(DataConnection connection, String schema, String table)
            throws ClassNotFoundException, SQLException, ParseException, IOException, QueryCancelledByUser, GrokConnectException {
        if (table == null) {
            return handleNoTable(connection);
        }
        return getSingleTableInfo(connection, table);
    }

    @Override
    public String getSchemaSql(String db, String schema, String table) {
        schema = db == null || db.isEmpty() ? schema : db;
        return String.format("SHOW COLUMN STATS %s.%s", schema, table);
    }

    @Override
    protected int setArrayParamValue(PreparedStatement statement, int n, FuncParam param) throws SQLException {
        //iterate ist and add all the parameters
        @SuppressWarnings (value="unchecked")
        ArrayList<Object> lst = (ArrayList<Object>)param.value;
        if (lst == null || lst.size() == 0) {
            statement.setObject(n, null);
            return 0;
        }
        for (int i = 0; i < lst.size(); i++) {
            System.out.println(n + i);
            statement.setObject(n + i, lst.get(i));
        }
        return lst.size() - 1;
    }

    @Override
    public String getConnectionStringImpl(DataConnection conn) {
        String port = (conn.getPort() == null) ? "" : ":" + conn.getPort();
        String schema = (String)conn.parameters.get(DbCredentials.SCHEMA);
        schema = schema == null ? "/" + descriptor.defaultSchema : "/" + schema;
        return String.format("jdbc:impala://%s%s%s", conn.getServer(), port, schema);
    }

    @Override
    public Properties getProperties(DataConnection conn) {
        Properties properties = new Properties();
        if (!conn.hasCustomConnectionString()) {
            if (conn.ssl()) {
                properties.setProperty("SSL", "1");
            }
            String login = conn.credentials.getLogin();
            String password = conn.credentials.getPassword();
            if (login != null && !login.isEmpty() && password != null && !password.isEmpty()) {
                properties.setProperty("AuthMech", "3");
                properties.setProperty("UID", login);
                properties.setProperty("PWD", password);
            }
        }
        return properties;
    }

    @Override
    protected String getRegexQuery(String columnName, String regexExpression) {
        return String.format("REGEXP_LIKE(%s, '%s')", columnName, regexExpression);
    }

    @Override
    protected boolean isInteger(int type, String typeName, int precision, int scale) {
        return (type == java.sql.Types.INTEGER) || (type == java.sql.Types.TINYINT) ||
                (type == java.sql.Types.SMALLINT);
    }

    private DataFrame handleNoTable(DataConnection connection) throws GrokConnectException, QueryCancelledByUser, SQLException, ParseException, IOException, ClassNotFoundException {
        FuncCall queryRun = new FuncCall();
        queryRun.func = new DataQuery();
        queryRun.func.query = "SHOW TABLES;";
        queryRun.func.connection = connection;
        DataFrame tables = execute(queryRun);
        DataFrame result = new DataFrame();
        for (int i = 0; i < tables.rowCount; i++) {
            String table = tables.columns.get(0).get(i)
                    .toString();
            result.merge(getSingleTableInfo(connection, table));
        }
        return result;
    }

    private DataFrame getSingleTableInfo(DataConnection connection, String table) throws GrokConnectException,
            QueryCancelledByUser, SQLException, ParseException, IOException, ClassNotFoundException {
        FuncCall queryRun = new FuncCall();
        queryRun.func = new DataQuery();
        String currentSchema = connection.get(DbCredentials.SCHEMA);
        currentSchema = currentSchema == null || currentSchema.isEmpty() ? descriptor.defaultSchema : currentSchema;
        queryRun.func.query = getSchemaSql(currentSchema, currentSchema, table);
        queryRun.func.connection = connection;
        DataFrame result = execute(queryRun);
        prepareGetSchemaDataFrame(result, currentSchema, table);
        return result;
    }

    @SuppressWarnings("unchecked")
    private void prepareGetSchemaDataFrame(DataFrame dataFrame, String schema, String table) {
        dataFrame.columns.removeIf(column -> column.name.equalsIgnoreCase("#Distinct Values") ||
                column.name.equalsIgnoreCase("#Nulls") ||
                column.name.equalsIgnoreCase("Max Size") ||
                column.name.equalsIgnoreCase("Avg Size") ||
                column.name.equalsIgnoreCase("#Trues") ||
                column.name.equalsIgnoreCase("#Falses"));
        int size = dataFrame.columns.size();
        for (int i = 0; i < size; i++) {
            Column column = dataFrame.columns.get(i);
            if (column.name.equalsIgnoreCase("Column")) {
                column.name = "column_name";
            } else if (column.name.equalsIgnoreCase("Type")) {
                column.name = "data_type";
            }
        }
        Column tableSchema = new StringColumn();
        tableSchema.name = "table_schema";
        for (int i = 0; i < dataFrame.rowCount; i++) {
            tableSchema.add(schema);
        }
        dataFrame.addColumn(tableSchema);
        Column tableColumn = new StringColumn();
        tableColumn.name = "table_name";
        for (int i = 0; i < dataFrame.rowCount; i++) {
            tableColumn.add(table);
        }
        dataFrame.addColumn(tableColumn);
    }
}
