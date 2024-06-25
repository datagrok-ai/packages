package grok_connect.providers;

import java.nio.file.Files;
import java.nio.file.Paths;
import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.Map;
import grok_connect.connectors_info.DataConnection;
import grok_connect.connectors_info.DataSource;
import grok_connect.connectors_info.DbCredentials;
import grok_connect.managers.ColumnManager;
import grok_connect.managers.datetime_column.SQLiteDateTimeColumnManager;
import grok_connect.managers.string_column.SQLiteStringColumnManager;
import grok_connect.resultset.DefaultResultSetManager;
import grok_connect.resultset.ResultSetManager;
import grok_connect.utils.GrokConnectException;
import grok_connect.utils.Prop;
import grok_connect.utils.Property;
import grok_connect.utils.QueryCancelledByUser;
import serialization.*;

public class SQLiteDataProvider extends JdbcDataProvider {
    public boolean autoInterpolation() {
        return false;
    }

    public SQLiteDataProvider() {
        driverClassName = "org.sqlite.JDBC";

        descriptor = new DataSource();
        descriptor.type = "SQLite";
        descriptor.description = "Query SQLite database";
        descriptor.canBrowseSchema = true;
        descriptor.defaultSchema = "";
        descriptor.typesMap = new HashMap<String, String>() {{
            put("int", serialization.Types.INT);
            put("#float.*", serialization.Types.FLOAT);
            put("#varchar.*", serialization.Types.STRING);
            put("text", serialization.Types.STRING);
            put("timestamp", serialization.Types.STRING);
            put("blob", serialization.Types.BLOB);
        }};
        descriptor.connectionTemplate = new ArrayList<Property>() {{
            add(new Property(Property.STRING_TYPE, DbCredentials.DB, DbCredentials.DB_DESCRIPTION));
            add(new Property(Property.STRING_TYPE, DbCredentials.CONNECTION_STRING,
                    DbCredentials.CONNECTION_STRING_DESCRIPTION, new Prop("textarea")));
        }};
        descriptor.credentialsTemplate = new ArrayList<Property>() {{
            add(new Property(Property.STRING_TYPE, DbCredentials.LOGIN));
            add(new Property(Property.STRING_TYPE, DbCredentials.PASSWORD, new Prop("password")));
        }};
    }

    @Override
    public void testConnection(DataConnection conn) throws GrokConnectException {
        if (!Files.exists(Paths.get(conn.getDb())))
            throw new GrokConnectException("Connection is not available");
    }

    @Override
    public String getConnectionStringImpl(DataConnection conn) {
        return String.format("jdbc:sqlite:%s", conn.getDb());
    }

    @Override
    public DataFrame getSchemas(DataConnection connection) throws QueryCancelledByUser, GrokConnectException {
        StringColumn column = new StringColumn(new String[]{""});
        column.name = "TABLE_SCHEMA";
        DataFrame dataFrame = new DataFrame();
        dataFrame.addColumn(column);
        return dataFrame;
    }

    @Override
    public DataFrame getSchema(DataConnection connection, String schema, String table) throws QueryCancelledByUser,
            GrokConnectException {
        try (Connection dbConnection = getConnection(connection);
             ResultSet columns = dbConnection.getMetaData().getColumns(null, schema, table, null)) {
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
    public ResultSetManager getResultSetManager() {
        Map<String, ColumnManager<?>> defaultManagersMap = DefaultResultSetManager.getDefaultManagersMap();
        defaultManagersMap.put(Types.DATE_TIME, new SQLiteDateTimeColumnManager());
        defaultManagersMap.put(Types.STRING, new SQLiteStringColumnManager());
        return DefaultResultSetManager.fromManagersMap(defaultManagersMap);
    }
}
