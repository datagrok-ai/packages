package grok_connect.providers;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Properties;
import grok_connect.connectors_info.DataConnection;
import grok_connect.connectors_info.DataSource;
import grok_connect.connectors_info.DbCredentials;
import grok_connect.connectors_info.FuncParam;
import grok_connect.utils.GrokConnectUtil;
import grok_connect.utils.Prop;
import grok_connect.utils.Property;
import serialization.Types;

public class AthenaDataProvider extends JdbcDataProvider {
    public AthenaDataProvider() {
        driverClassName = "com.simba.athena.jdbc.Driver";

        Property encode = new Property(Property.STRING_TYPE, DbCredentials.S3OutputEncOption,
                "The encryption protocol that the driver uses to encrypt your query results "
                        + "before storing them on Amazon S3");
        encode.choices = new ArrayList<String>() {{ add("SSE_S3"); add("SSE_KMS"); add("CSE_KMS");}};

        descriptor = new DataSource();
        descriptor.type = "Athena";
        descriptor.description = "Query Athena database";
        descriptor.connectionTemplate = new ArrayList<Property>() {{
            add(new Property(Property.STRING_TYPE, DbCredentials.REGION_ID,
                    "The AWS region of the Athena and AWS Glue instance that you want to connect to."
            ));
            add(new Property(Property.STRING_TYPE, DbCredentials.VPC_ENDPOINT,
                    "Specific VPC endpoint of service."
                            + " If not  specified, then canonical endpoint - "
                            + "\"athena.[Region].amazonaws.com:443\" will be used"
            ));
            add(new Property(Property.STRING_TYPE, DbCredentials.DB, "The name of the database schema to "
                    + "use when a schema is not explicitly specified in\n"
                    + "a query. You can still issue queries on other schemas by explicitly specifying the "
                    + "schema in the query."));
            add(new Property(Property.STRING_TYPE, DbCredentials.S3OutputLocation,
                    "The path of the Amazon S3 location where you want to store query results"));
            add(encode);
            add(new Property(Property.STRING_TYPE, DbCredentials.CONNECTION_STRING,
                    "When specified, this connection string overrides all other parameters",
                    new Prop("textarea")));
        }};
        descriptor.credentialsTemplate = new ArrayList<Property>() {{
            add(new Property(Property.STRING_TYPE, DbCredentials.ACCESS_KEY,
                    "Set this property to the access\n"
                            + "key provided by your AWS account.\n"));
            add(new Property(Property.STRING_TYPE, DbCredentials.SECRET_KEY,
                    "Set this property to the secret\n"
                            + "key provided by your AWS account.", new Prop("password")));
        }};
        descriptor.canBrowseSchema = true;
        descriptor.defaultSchema = "default";
        descriptor.nameBrackets = "\"\"";
        descriptor.typesMap = new HashMap<String, String>() {{
            put("tinyint", Types.INT);
            put("smallint", Types.INT);
            put("integer", Types.INT);
            put("bigint", Types.BIG_INT);
            put("real", Types.FLOAT);
            put("double", Types.FLOAT);
            put("#decimal.*", Types.FLOAT);
            put("boolean", Types.BOOL);
            put("#char.*", Types.STRING);
            put("#varchar.*", Types.STRING);
            put("text", Types.STRING);
            put("#map.*", Types.MAP);
            put("date", Types.DATE_TIME);
            put("#timestamp.*", Types.DATE_TIME);
            put("#row.*", Types.MAP);
            put("#array.*", Types.LIST);
        }};
    }

    @Override
    public boolean autoInterpolation() {
        return false;
    }

    @Override
    public String getConnectionStringImpl(DataConnection conn) {
        String formatString;
        String vpc = conn.get(DbCredentials.VPC_ENDPOINT);
        if (GrokConnectUtil.isEmpty(vpc))
            formatString = "jdbc:awsathena://athena.%s.amazonaws.com:443;";
        else
            formatString = vpc + ".athena.%s.vpce.amazonaws.com:443;";
        return String.format(formatString,
                conn.get(DbCredentials.REGION_ID));
    }

    @Override
    public Properties getProperties(DataConnection conn) {
        Properties properties = new Properties();
        setIfNotNull(properties, "User", (String )conn.credentials.parameters.get(DbCredentials.ACCESS_KEY));
        setIfNotNull(properties, "Password", (String) conn.credentials.parameters.get(DbCredentials.SECRET_KEY));
        if (!conn.hasCustomConnectionString()) {
            setIfNotNull(properties, "S3OutputLocation", conn.get(DbCredentials.S3OutputLocation));
            setIfNotNull(properties, "Schema", conn.getDb());
            setIfNotNull(properties, "S3OutputEncOption", conn.get(DbCredentials.S3OutputEncOption));
        }
        return properties;
    }

    @Override
    public String getSchemasSql(String db) {
        return "SELECT DISTINCT table_schema FROM information_schema.columns";
    }

    @Override
    public String getSchemaSql(String db, String schema, String table) {
        List<String> filters = new ArrayList<String>() {{
            add("c.table_schema = '" + ((schema != null) ? schema : descriptor.defaultSchema) + "'");
        }};

        if (GrokConnectUtil.isNotEmpty(table))
            filters.add("c.table_name = '" + table + "'");

        String whereClause = "WHERE " + String.join(" AND \n", filters);

        return "SELECT c.table_schema as table_schema, c.table_name as table_name, c.column_name as column_name, "
                + "c.data_type as data_type, "
                + "case t.table_type when 'VIEW' then 1 else 0 end as is_view FROM information_schema.columns c "
                + "JOIN information_schema.tables t ON t.table_name = c.table_name " + whereClause +
                " ORDER BY c.table_name";
    }

    @Override
    public String castParamValueToSqlDateTime(FuncParam param) {
        return "TIMESTAMP'" + param.value.toString() + "'";
    }

    @Override
    protected String interpolateBool(FuncParam param) {
        return ((boolean) param.value) ? "true" : "false";
    }

    @Override
    protected String getRegexQuery(String columnName, String regexExpression) {
        return String.format("REGEXP_LIKE(%s, '%s')", columnName, regexExpression);
    }

    @Override
    public String addBrackets(String name) {
        String brackets = descriptor.nameBrackets;
        return brackets.charAt(0) + name + brackets.substring(brackets.length() - 1);
    }
}
