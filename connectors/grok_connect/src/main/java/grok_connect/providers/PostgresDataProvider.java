package grok_connect.providers;

import java.sql.Array;
import java.sql.PreparedStatement;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Properties;
import grok_connect.connectors_info.DataConnection;
import grok_connect.connectors_info.DataSource;
import grok_connect.connectors_info.DbCredentials;
import grok_connect.connectors_info.FuncParam;
import grok_connect.table_query.AggrFunctionInfo;
import grok_connect.table_query.Stats;
import grok_connect.utils.Property;
import org.postgresql.util.PGobject;
import serialization.Types;

public class PostgresDataProvider extends JdbcDataProvider {
    public PostgresDataProvider() {
        driverClassName = "org.postgresql.Driver";

        descriptor = new DataSource();
        descriptor.type = "Postgres";
        descriptor.description = "Query Postgres database";
        descriptor.connectionTemplate = new ArrayList<>(DbCredentials.dbConnectionTemplate);
        descriptor.connectionTemplate.add(new Property(Property.BOOL_TYPE, DbCredentials.SSL));
        descriptor.credentialsTemplate = DbCredentials.dbCredentialsTemplate;
        descriptor.nameBrackets = "\"";

        descriptor.canBrowseSchema = true;
        descriptor.defaultSchema = "public";
        descriptor.typesMap = new HashMap<String, String>() {{
            put("smallint", Types.INT);
            put("int", Types.INT);
            put("integer", Types.INT);
            put("bigint", Types.BIG_INT);
            put("real", Types.FLOAT);
            put("double precision", Types.FLOAT);
            put("numeric", Types.FLOAT);
            put("#character.*", Types.STRING);
            put("#varchar.*", Types.STRING);
            put("text", Types.STRING);
            put("boolean", Types.BOOL);
            put("date", Types.DATE_TIME);
            put("#timestamp.*", Types.DATE_TIME);
            put("cidr", Types.STRING);
            put("ARRAY", Types.LIST);
            put("USER_DEFINED", Types.STRING);
            put("bit.*", Types.BIG_INT);
            put("uuid", Types.STRING);
            put("xml", Types.OBJECT);
        }};
        descriptor.aggregations.add(new AggrFunctionInfo(Stats.STDEV, "stddev(#)", Types.dataFrameNumericTypes));
    }

    @Override
    public Properties getProperties(DataConnection conn) {
        java.util.Properties properties = defaultConnectionProperties(conn);
        if (!conn.hasCustomConnectionString() && conn.ssl()) {
            properties.setProperty("ssl", "true");
            properties.setProperty("sslfactory", "org.postgresql.ssl.NonValidatingFactory");
        }
        properties.setProperty("socketTimeout", "180");
        properties.setProperty("tcpKeepAlive", "true");
        return properties;
    }

    @Override
    public String getConnectionStringImpl(DataConnection conn) {
        String port = (conn.getPort() == null) ? "" : ":" + conn.getPort();
        return "jdbc:postgresql://" + conn.getServer() + port + "/" + conn.getDb();
    }

    @Override
    public String getSchemasSql(String db) {
        return "SELECT DISTINCT table_schema FROM information_schema.columns";
    }

    @Override
    public String getSchemaSql(String db, String schema, String table)
    {
        List<String> filters = new ArrayList<String>() {{
            add("c.table_schema = '" + ((schema != null) ? schema : descriptor.defaultSchema) + "'");
        }};

        if (db != null && db.length() != 0)
            filters.add("c.table_catalog = '" + db + "'");

        if (table != null)
            filters.add("c.table_name = '" + table + "'");

        String whereClause = "WHERE " + String.join(" AND \n", filters);

        return "SELECT c.table_schema as table_schema, c.table_name as table_name, c.column_name as column_name, "
                + "c.data_type as data_type, "
                + "case t.table_type when 'VIEW' then 1 else 0 end as is_view FROM information_schema.columns c "
                + "JOIN information_schema.tables t ON t.table_name = c.table_name " + whereClause +
                " ORDER BY c.table_name";
    }

    @Override
    protected String getRegexQuery(String columnName, String regexExpression) {
        return String.format("%s ~ '%s'", columnName, regexExpression);
    }

    @Override
    protected void setUuid(PreparedStatement statement, int n, String value) throws SQLException {
        PGobject uuid = new PGobject();
        uuid.setType("uuid");
        uuid.setValue(value);
        statement.setObject(n, uuid);
    }

    @SuppressWarnings("unchecked")
    @Override
    protected int setArrayParamValue(PreparedStatement statement, int n, FuncParam param) throws SQLException {
        ArrayList<String> value = param.value == null ? null : (ArrayList<String>) param.value;
        if (value == null)
            statement.setNull(n, java.sql.Types.ARRAY);
        else {
            String type = value.isEmpty() || !value.stream().allMatch(s -> UUID_REGEX.matcher(s).matches())
                    ? "TEXT" : "UUID";
            Array array = statement.getConnection().createArrayOf(type, value.toArray());
            statement.setArray(n, array);
        }
        return 0;
    }
}
