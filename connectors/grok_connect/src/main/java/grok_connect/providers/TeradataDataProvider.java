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
import serialization.DataFrame;
import serialization.StringColumn;
import serialization.Types;

public class TeradataDataProvider extends JdbcDataProvider {
    public TeradataDataProvider() {
        driverClassName = "com.teradata.jdbc.TeraDriver";

        descriptor = new DataSource();
        descriptor.type = "Teradata";
        descriptor.description = "Query Teradata database";
        descriptor.connectionTemplate = new ArrayList<>(DbCredentials.dbConnectionTemplate);
        descriptor.connectionTemplate.add(new Property(Property.BOOL_TYPE, DbCredentials.SSL));
        descriptor.credentialsTemplate = DbCredentials.dbCredentialsTemplate;
        descriptor.canBrowseSchema = true;
        descriptor.nameBrackets = "\"";

        descriptor.typesMap = new HashMap<String, String>() {{
            put("#.*byte.*", Types.BLOB);
            put("#blob.*", Types.BLOB);
            put("#.*char.*", Types.STRING);
            put("#clob.*", Types.OBJECT);
            put("#decimal.*", Types.FLOAT);
            put("#number.*", Types.FLOAT);
            put("float", Types.FLOAT);
            put("byteint", Types.INT);
            put("smallint", Types.INT);
            put("integer", Types.INT);
            put("bigint", Types.BIG_INT);
            put("date", Types.DATE_TIME);
            put("#time.*", Types.DATE_TIME);
            put("#timestamp.*", Types.DATE_TIME);
            put("#interval.*", Types.DATE_TIME);
            put("#period.*", Types.DATE_TIME);
            put("#sysudtlib.*", Types.OBJECT);
            put("#<unknown>.*", Types.OBJECT);
            put("st_geometry", Types.OBJECT);
            put("xml", Types.OBJECT);
        }};
    }

    @Override
    public Properties getProperties(DataConnection conn) {
        Properties properties = defaultConnectionProperties(conn);
        if (!conn.hasCustomConnectionString() && conn.ssl())
            properties.setProperty("ENABLESSL", "true");
        return properties;

    }

    @Override
    public String getConnectionStringImpl(DataConnection conn) {
        String db = conn.getDb();
        String port = conn.getPort();
        return String.format("jdbc:teradata://%s/%s,%s",
                conn.getServer(),
                db == null ? "" : String.format("database=%s", db),
                port == null ? "" : String.format("dbs_port=%s", port));
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

        if (db == null || db.length() == 0)
            db = schema;

        if (db != null && db.length() != 0)
            filters.add("c.databaseName = '" + db + "'");

        if (table != null)
            filters.add("c.tableName = '" + table + "'");

        String whereClause = filters.size() != 0 ? "WHERE " + String.join(" and \n", filters) : "";

        return "SELECT DISTINCT c.databaseName as table_schema, c.tableName as table_name, c.columnName as column_name, CASE c.ColumnType \n" +
                "    WHEN 'BF' THEN 'BYTE('            || TRIM(CAST(ColumnLength AS INTEGER)) || ')'\n" +
                "    WHEN 'BV' THEN 'VARBYTE('         || TRIM(CAST(ColumnLength AS INTEGER)) || ')'\n" +
                "    WHEN 'CF' THEN 'CHAR('            || TRIM(CAST(ColumnLength AS INTEGER)) || ')'\n" +
                "    WHEN 'CV' THEN 'VARCHAR('         || TRIM(CAST(ColumnLength AS INTEGER)) || ')'\n" +
                "    WHEN 'D ' THEN 'DECIMAL('         || TRIM(DecimalTotalDigits) || ','\n" +
                "                                      || TRIM(DecimalFractionalDigits) || ')'\n" +
                "    WHEN 'DA' THEN 'DATE'\n" +
                "    WHEN 'XM' THEN 'XML'\n" +
                "    WHEN 'F ' THEN 'FLOAT'\n" +
                "    WHEN 'I1' THEN 'BYTEINT'\n" +
                "    WHEN 'I2' THEN 'SMALLINT'\n" +
                "    WHEN 'I8' THEN 'BIGINT'\n" +
                "    WHEN 'I ' THEN 'INTEGER'\n" +
                "    WHEN 'AT' THEN 'TIME('            || TRIM(DecimalFractionalDigits) || ')'\n" +
                "    WHEN 'TS' THEN 'TIMESTAMP('       || TRIM(DecimalFractionalDigits) || ')'\n" +
                "    WHEN 'TZ' THEN 'TIME('            || TRIM(DecimalFractionalDigits) || ')' || ' WITH TIME ZONE'\n" +
                "    WHEN 'SZ' THEN 'TIMESTAMP('       || TRIM(DecimalFractionalDigits) || ')' || ' WITH TIME ZONE'\n" +
                "    WHEN 'YR' THEN 'INTERVAL YEAR('   || TRIM(DecimalTotalDigits) || ')'\n" +
                "    WHEN 'YM' THEN 'INTERVAL YEAR('   || TRIM(DecimalTotalDigits) || ')'      || ' TO MONTH'\n" +
                "    WHEN 'MO' THEN 'INTERVAL MONTH('  || TRIM(DecimalTotalDigits) || ')'\n" +
                "    WHEN 'DY' THEN 'INTERVAL DAY('    || TRIM(DecimalTotalDigits) || ')'\n" +
                "    WHEN 'DH' THEN 'INTERVAL DAY('    || TRIM(DecimalTotalDigits) || ')'      || ' TO HOUR'\n" +
                "    WHEN 'DM' THEN 'INTERVAL DAY('    || TRIM(DecimalTotalDigits) || ')'      || ' TO MINUTE'\n" +
                "    WHEN 'DS' THEN 'INTERVAL DAY('    || TRIM(DecimalTotalDigits) || ')'      || ' TO SECOND('\n" +
                "                                      || TRIM(DecimalFractionalDigits) || ')'\n" +
                "    WHEN 'HR' THEN 'INTERVAL HOUR('   || TRIM(DecimalTotalDigits) || ')'\n" +
                "    WHEN 'HM' THEN 'INTERVAL HOUR('   || TRIM(DecimalTotalDigits) || ')'      || ' TO MINUTE'\n" +
                "    WHEN 'HS' THEN 'INTERVAL HOUR('   || TRIM(DecimalTotalDigits) || ')'      || ' TO SECOND('\n" +
                "                                      || TRIM(DecimalFractionalDigits) || ')'\n" +
                "    WHEN 'MI' THEN 'INTERVAL MINUTE(' || TRIM(DecimalTotalDigits) || ')'\n" +
                "    WHEN 'MS' THEN 'INTERVAL MINUTE(' || TRIM(DecimalTotalDigits) || ')'      || ' TO SECOND('\n" +
                "                                      || TRIM(DecimalFractionalDigits) || ')'\n" +
                "    WHEN 'SC' THEN 'INTERVAL SECOND(' || TRIM(DecimalTotalDigits) || ',' \n" +
                "                                      || TRIM(DecimalFractionalDigits) || ')'\n" +
                "    WHEN 'BO' THEN 'BLOB('            || TRIM(CAST(ColumnLength AS INTEGER)) || ')'\n" +
                "    WHEN 'CO' THEN 'CLOB('            || TRIM(CAST(ColumnLength AS INTEGER)) || ')'\n" +
                "\n" +
                "    WHEN 'PD' THEN 'PERIOD(DATE)'     \n" +
                "    WHEN 'PM' THEN 'PERIOD(TIMESTAMP('|| TRIM(DecimalFractionalDigits) || ')' || ' WITH TIME ZONE'\n" +
                "    WHEN 'PS' THEN 'PERIOD(TIMESTAMP('|| TRIM(DecimalFractionalDigits) || '))'\n" +
                "    WHEN 'PT' THEN 'PERIOD(TIME('     || TRIM(DecimalFractionalDigits) || '))'\n" +
                "    WHEN 'PZ' THEN 'PERIOD(TIME('     || TRIM(DecimalFractionalDigits) || '))' || ' WITH TIME ZONE'\n" +
                "    WHEN 'UT' THEN COALESCE(ColumnUDTName,  '<Unknown> ' || ColumnType)\n" +
                "\n" +
                "    WHEN '++' THEN 'TD_ANYTYPE'\n" +
                "    WHEN 'N'  THEN 'NUMBER('          || CASE WHEN DecimalTotalDigits = -128 THEN '*' ELSE TRIM(DecimalTotalDigits) END\n" +
                "                                      || CASE WHEN DecimalFractionalDigits IN (0, -128) THEN '' ELSE ',' || TRIM(DecimalFractionalDigits) END\n" +
                "                                      || ')'\n" +
                "    WHEN 'A1' THEN COALESCE('SYSUDTLIB.' || ColumnUDTName,  '<Unknown> ' || ColumnType)\n" +
                "    WHEN 'AN' THEN COALESCE('SYSUDTLIB.' || ColumnUDTName,  '<Unknown> ' || ColumnType)\n" +
                "\n" +
                "    ELSE '<Unknown> ' end as data_type" +
                ", case t.TableKind when 'V' then 1 else 0 end as is_view FROM DBC.ColumnsV " +
                "AS c JOIN DBC.TablesV AS t ON c.databaseName = t.databaseName " + whereClause + " ORDER BY c.tableName";
    }

    @Override
    public String limitToSql(String query, Integer limit) {
        return query + "sample " + limit.toString();
    }

    @Override
    public String addBrackets(String name) {
        String brackets = descriptor.nameBrackets;
        return name.startsWith(brackets.substring(0, 1)) ? name :
                brackets.charAt(0) + name + brackets.substring(brackets.length() - 1);
    }

    @Override
    protected String getRegexQuery(String columnName, String regexExpression) {
        return String.format("(REGEXP_SIMILAR(%s, '%s') = 1)", columnName, regexExpression);
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
