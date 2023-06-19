package grok_connect.providers;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.sql.*;
import java.text.ParseException;
import java.util.*;

import grok_connect.GrokConnect;
import serialization.*;
import grok_connect.utils.*;
import grok_connect.table_query.*;
import grok_connect.connectors_info.*;
import serialization.Types;


public class AccessDataProvider extends JdbcDataProvider {
    public AccessDataProvider(ProviderManager providerManager) {
        super(providerManager);

        driverClassName = "net.ucanaccess.jdbc.UcanaccessDriver";

        descriptor = new DataSource();
        descriptor.type = "Access";
        descriptor.description = "Query Access database";
        descriptor.canBrowseSchema = true;
        descriptor.typesMap = new HashMap<String, String>() {{
            put("integer", serialization.Types.INT);
            put("smallint", serialization.Types.INT);
            put("boolean", Types.BOOL);
            put("decimal", serialization.Types.FLOAT);
            put("double", serialization.Types.FLOAT);
            put("varchar", serialization.Types.STRING);
            put("timestamp", Types.DATE_TIME);
            put("blob", serialization.Types.BLOB);
        }};
        descriptor.connectionTemplate = new ArrayList<Property>() {{
            add(new Property(Property.STRING_TYPE, DbCredentials.CONNECTION_STRING,
                    DbCredentials.CONNECTION_STRING_DESCRIPTION, new Prop("textarea")));
            add(new Property(Property.STRING_TYPE, DbCredentials.DB, DbCredentials.DB_DESCRIPTION));
        }};
        descriptor.credentialsTemplate = new ArrayList<Property>() {{
            add(new Property(Property.STRING_TYPE, DbCredentials.LOGIN));
            add(new Property(Property.STRING_TYPE, DbCredentials.PASSWORD, new Prop("password")));
        }};
    }

    @Override
    public DataFrame getSchemas(DataConnection connection) throws ClassNotFoundException, SQLException, ParseException, IOException, QueryCancelledByUser, GrokConnectException {
        StringColumn column = new StringColumn(new String[]{""});
        column.name = "TABLE_SCHEMA";
        DataFrame dataFrame = new DataFrame();
        dataFrame.addColumn(column);
        return dataFrame;
    }

    @Override
    public DataFrame getSchema(DataConnection connection, String schema, String table) throws ClassNotFoundException, SQLException, ParseException, IOException, QueryCancelledByUser, GrokConnectException {
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
        Connection dbConnection = getConnection(connection);
        ResultSet columns = dbConnection.getMetaData().getColumns(null, null, null, null);
        while (columns.next()) {
            result.addRow(columns.getString(2), columns.getString(3),
                    columns.getString(4), columns.getString(6));
        }
        return result;
    }

    @Override
    public String testConnection(DataConnection conn) throws ClassNotFoundException, SQLException {
        boolean exists = Files.exists(Paths.get(String.format("%s/%s", GrokConnect.getInfo().get("basedir"), conn.getDb())));
        return exists ? DataProvider.CONN_AVAILABLE : "Connection is not available";
    }

    @Override
    public String getConnectionStringImpl(DataConnection conn) {
        return String.format("jdbc:ucanaccess://%s/%s;sysSchema=true;memory=false",
                GrokConnect.getInfo().get("basedir"), conn.getDb());

    }

    @Override
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
            return String.format("%s AS [%s]", sql, sql);
        } else
            return null;
    }
}
