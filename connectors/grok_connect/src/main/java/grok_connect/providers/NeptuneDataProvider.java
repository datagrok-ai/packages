package grok_connect.providers;

import grok_connect.managers.ColumnManager;
import grok_connect.managers.complex_column.Neo4jComplexColumnManager;
import grok_connect.connectors_info.DataConnection;
import grok_connect.connectors_info.DataSource;
import grok_connect.connectors_info.DbCredentials;
import grok_connect.connectors_info.FuncParam;
import grok_connect.resultset.DefaultResultSetManager;
import grok_connect.resultset.ResultSetManager;
import grok_connect.utils.GrokConnectException;
import grok_connect.utils.Prop;
import grok_connect.utils.Property;
import serialization.Types;
import shadow.org.neo4j.driver.internal.value.NodeValue;
import software.aws.neptune.opencypher.resultset.OpenCypherResultSet;
import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Method;
import java.sql.*;
import java.util.ArrayList;
import java.util.Map;
import java.util.Properties;

public class NeptuneDataProvider extends JdbcDataProvider {
    private static final String COMPLEX_COLUMN_NAME = "NODE";

    public NeptuneDataProvider() {
        driverClassName = "software.aws.neptune.NeptuneDriver";
        descriptor = new DataSource();
        descriptor.type = "Neptune";
        descriptor.commentStart = "//";
        descriptor.description = "Amazon Neptune is a fully managed graph database service";
        descriptor.connectionTemplate = new ArrayList<Property>() {{
            add(new Property(Property.STRING_TYPE, DbCredentials.SERVER));
            add(new Property(Property.INT_TYPE, DbCredentials.PORT, new Prop()));
            add(new Property(Property.STRING_TYPE, "serviceRegion"));
            add(new Property(Property.STRING_TYPE, DbCredentials.CONNECTION_STRING,
                    DbCredentials.CONNECTION_STRING_DESCRIPTION, new Prop("textarea")));
            add(new Property(Property.BOOL_TYPE, DbCredentials.CACHE_SCHEMA));
            add(new Property(Property.BOOL_TYPE, DbCredentials.CACHE_RESULTS));
            add(new Property(Property.STRING_TYPE, DbCredentials.CACHE_INVALIDATE_SCHEDULE));
        }};
        descriptor.credentialsTemplate = new ArrayList<Property>() {{
            add(new Property(Property.STRING_TYPE, "accessKey"));
            add(new Property(Property.STRING_TYPE, "secretAccessKey", new Prop("password")));
        }};
    }

    @Override
    public Properties getProperties(DataConnection conn) {
        java.util.Properties properties = new java.util.Properties();
        if (!conn.hasCustomConnectionString() && conn.ssl()) {
            properties.setProperty("authScheme", "IAMSigV4");
            properties.setProperty("enableSsl", "true");
        }
        if (conn.credentials != null) {
            if (conn.credentials.parameters.get("accessKey") != null)
                System.setProperty("aws.accessKeyId",
                        conn.credentials.parameters.get("accessKey").toString());
            if (conn.credentials.parameters.get("secretAccessKey") != null)
                System.setProperty("aws.secretKey",
                        conn.credentials.parameters.get("secretAccessKey").toString());
        }
        setIfNotNull(properties, "serviceRegion", (String) conn.parameters.get("serviceRegion"));
        return properties;
    }

    @Override
    public Connection getConnection(DataConnection conn) throws GrokConnectException, SQLException {
        prepareProvider();
        return DriverManager.getConnection(getConnectionString(conn), getProperties(conn));
    }

    @Override
    public String getConnectionStringImpl(DataConnection conn) {
        String port = (conn.getPort() == null) ? "" : ";port=" + conn.getPort();
        return "jdbc:neptune:gremlin://" + conn.getServer() + port;
    }

    @Override
    public boolean autoInterpolation() {
        return false;
    }

    @Override
    protected String interpolateBool(FuncParam param) {
        return ((boolean) param.value) ? "true" : "false";
    }

    @Override
    protected Object getObjectFromResultSet(ResultSet resultSet, int c) {
        String columnTypeName;
        try {
            columnTypeName = resultSet.getMetaData().getColumnTypeName(c);
            if (!columnTypeName.equals(COMPLEX_COLUMN_NAME)) {
                return resultSet.getObject(c);
            }
        } catch (SQLException e) {
            throw new RuntimeException("Something went wrong when getting value from resultSet", e);
        }
        try {
            Method getValue = OpenCypherResultSet.class.getDeclaredMethod("getValue", int.class);
            getValue.setAccessible(true);
            Object object = getValue.invoke(resultSet, c);
            getValue.setAccessible(false);
            return ((NodeValue) object).asMap();
        } catch (NoSuchMethodException | InvocationTargetException | IllegalAccessException e) {
            throw new RuntimeException("Something went wrong when getting value as map from resultSet", e);
        }
    }

    @Override
    public ResultSetManager getResultSetManager() {
        Map<String, ColumnManager<?>> defaultManagersMap = DefaultResultSetManager.getDefaultManagersMap();
        defaultManagersMap.put(Types.COLUMN_LIST, new Neo4jComplexColumnManager());
        return DefaultResultSetManager.fromManagersMap(defaultManagersMap);
    }

    @Override
    protected ResultSet executeStatement(PreparedStatement statement) throws SQLException {
        return statement.executeQuery();
    }
}

