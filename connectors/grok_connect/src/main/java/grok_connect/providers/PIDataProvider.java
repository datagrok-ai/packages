package grok_connect.providers;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.stream.Collectors;
import grok_connect.connectors_info.DataConnection;
import grok_connect.connectors_info.DataQuery;
import grok_connect.connectors_info.DataSource;
import grok_connect.connectors_info.DbCredentials;
import grok_connect.connectors_info.FuncParam;
import grok_connect.utils.GrokConnectException;
import grok_connect.utils.Prop;
import grok_connect.utils.Property;
import grok_connect.utils.QueryCancelledByUser;
import serialization.Column;
import serialization.DataFrame;
import serialization.StringColumn;
import serialization.Types;

public class PIDataProvider extends JdbcDataProvider {
    private static final int CATALOG_NAME_INDEX = 1;
    private static final int TABLE_NAME_INDEX = 3;
    private static final int COLUMN_NAME_INDEX = 4;
    private static final int DATA_TYPE_NAME_INDEX = 6;

    public PIDataProvider() {
        driverClassName = "com.osisoft.jdbc.Driver";
        descriptor = new DataSource();
        descriptor.type = "PI";
        descriptor.description = "Query PI database";
        descriptor.connectionTemplate = new ArrayList<Property>() {{
            add(new Property(Property.STRING_TYPE, DbCredentials.ACCESS_SERVER));
            add(new Property(Property.STRING_TYPE, DbCredentials.SERVER));

            add(new Property(Property.STRING_TYPE, DbCredentials.INITIAL_CATALOG, "Name of the catalog,"
                    + " e.g. piarchive, pibatch, pids, pifunction, piheading, "
                    + "pilog, pimodule, pipoint, pisystem or piuser"));
            add(new Property(Property.STRING_TYPE, DbCredentials.CONNECTION_STRING,
                    DbCredentials.CONNECTION_STRING_DESCRIPTION, new Prop("textarea")));
            add(new Property(Property.BOOL_TYPE, DbCredentials.CACHE_SCHEMA));
            add(new Property(Property.BOOL_TYPE, DbCredentials.CACHE_RESULTS));
            add(new Property(Property.STRING_TYPE, DbCredentials.CACHE_INVALIDATE_SCHEDULE));
        }};
        descriptor.credentialsTemplate = DbCredentials.dbCredentialsTemplate;
        descriptor.nameBrackets = "\"";
        descriptor.canBrowseSchema = true;
        descriptor.limitAtEnd = false;
        descriptor.typesMap = new HashMap<String, String>() {{
            put("#float.*", Types.FLOAT);
            put("wstring", Types.STRING);
            put("string", Types.STRING);
            put("datetime", Types.DATE_TIME);
            put("time", Types.DATE_TIME);
            put("variant", Types.OBJECT);
            put("#^(int(8|16|32))$", serialization.Types.INT);
            put("#^(uint(8|16))$", serialization.Types.INT);
            put("#^(int(64|128|256))$", serialization.Types.BIG_INT);
            put("#^(uint(32|64|128|256))$", serialization.Types.BIG_INT);
            put("bool", Types.BOOL);
        }};
    }

    @Override
    public String getConnectionStringImpl(DataConnection conn) {
        String initialCatalog = conn.get(DbCredentials.INITIAL_CATALOG);
        return String.format("jdbc:pioledb://%s/Data Source=%s;%sIntegrated Security=SSPI",
                conn.parameters.get(DbCredentials.ACCESS_SERVER),  conn.getServer(),
                initialCatalog != null ? String.format("Initial Catalog=%s;", initialCatalog) : "");
    }

    @Override
    public void appendQueryParam(DataQuery dataQuery, String paramName, StringBuilder queryBuffer) {
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
    public DataFrame getSchemas(DataConnection connection) throws QueryCancelledByUser, GrokConnectException {
        try (Connection dbConnection = getConnection(connection);
             ResultSet catalogs = dbConnection.getMetaData().getCatalogs()) {
            DataFrame result = new DataFrame();
            Column tableSchema = new StringColumn();
            tableSchema.name = "table_schema";
            result.addColumn(tableSchema);
            while (catalogs .next())
                result.addRow(catalogs.getString(CATALOG_NAME_INDEX));
            return result;
        } catch (SQLException e) {
            throw new GrokConnectException(e);
        }
    }

    @Override
    public DataFrame getSchema(DataConnection connection, String schema, String table) throws
            QueryCancelledByUser, GrokConnectException {
        try (Connection dbConnection = getConnection(connection);
             ResultSet columns = dbConnection.getMetaData().getColumns(schema, null, table, null)) {
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
                result.addRow(columns.getString(CATALOG_NAME_INDEX), columns.getString(TABLE_NAME_INDEX),
                        columns.getString(COLUMN_NAME_INDEX), columns.getString(DATA_TYPE_NAME_INDEX));
            return result;
        } catch (SQLException e) {
            throw new GrokConnectException(e);
        }
    }

    @Override
    public String limitToSql(String query, Integer limit) {
        return query + "top " + limit.toString() + " ";
    }
}
