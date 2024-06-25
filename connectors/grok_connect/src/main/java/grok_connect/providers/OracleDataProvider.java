package grok_connect.providers;

import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import grok_connect.managers.ColumnManager;
import grok_connect.managers.bigint_column.OracleBigIntColumnManager;
import grok_connect.managers.integer_column.OracleSnowflakeIntColumnManager;
import grok_connect.connectors_info.DataConnection;
import grok_connect.connectors_info.DataQuery;
import grok_connect.connectors_info.DataSource;
import grok_connect.connectors_info.DbCredentials;
import grok_connect.connectors_info.FuncParam;
import grok_connect.resultset.DefaultResultSetManager;
import grok_connect.resultset.OracleResultSetManager;
import grok_connect.resultset.ResultSetManager;
import grok_connect.table_query.AggrFunctionInfo;
import grok_connect.table_query.Stats;
import grok_connect.utils.Property;
import oracle.jdbc.OracleResultSet;
import oracle.sql.json.OracleJsonObject;
import serialization.Types;

public class OracleDataProvider extends JdbcDataProvider {
    private static final String SYS_SCHEMAS_FILTER =
            "COL.OWNER != 'SYSTEM' AND COL.OWNER != 'CTXSYS' AND COL.OWNER != 'MDSYS' " +
            "AND COL.OWNER != 'XDB' AND COL.OWNER != 'APEX_040000' AND COL.OWNER != 'SYS' " +
            "AND COL.OWNER != 'WMSYS' AND COL.OWNER != 'EXFSYS' AND COL.OWNER != 'ORDSYS' " +
            "AND COL.OWNER != 'ORDDATA'";

    public OracleDataProvider() {
        driverClassName = "oracle.jdbc.OracleDriver";
        descriptor = new DataSource();
        descriptor.type = "Oracle";
        descriptor.description = "Query Oracle database";
        descriptor.connectionTemplate = new ArrayList<>(DbCredentials.dbConnectionTemplate);
        descriptor.connectionTemplate.add(new Property(Property.BOOL_TYPE, DbCredentials.SSL));
        descriptor.credentialsTemplate = DbCredentials.dbCredentialsTemplate;
        descriptor.canBrowseSchema = true;
        descriptor.nameBrackets = "\"";

        descriptor.typesMap = new HashMap<String, String>() {{
            put("long", Types.INT);
            put("float", Types.FLOAT);
            put("#number\\([1-9], 0\\)", Types.INT);
            put("#number\\((3[0-8]|[1-2][0-9]), 0\\)", Types.BIG_INT);
            put("#number\\((3[0-8]|[1-2][0-9]|[1-9]), -?[^0]+\\)", Types.FLOAT);
            put("binary_float", Types.FLOAT);
            put("binary_double", Types.FLOAT);
            put("#.*char.*", Types.STRING);
            put("#.*varchar.*", Types.STRING);
            put("date", Types.DATE_TIME);
            put("#timestamp.*", Types.DATE_TIME);
            put("#interval.*", Types.DATE_TIME);
            put("json", Types.OBJECT);
            put("#.*clob.*", Types.BLOB);
            put("blob", Types.BLOB);
            put("uritype", Types.OBJECT);
            put("mem_type", Types.OBJECT);
            put("xmltype", Types.OBJECT);
        }};
        descriptor.aggregations.add(new AggrFunctionInfo(Stats.STDEV, "stddev(#)", Types.dataFrameNumericTypes));
        descriptor.aggregations.add(new AggrFunctionInfo(Stats.STDEV, "median(#)", Types.dataFrameNumericTypes));
    }

    @Override
    public void prepareProvider() {
        System.getProperties().setProperty("oracle.jdbc.J2EE13Compliant", "true");
    }

    @Override
    protected String getRegexQuery(String columnName, String regexExpression) {
        return String.format("REGEXP_LIKE (%s, '%s', 'i')", columnName, regexExpression);
    }

    @Override
    protected Object getObjectFromResultSet(ResultSet resultSet, int c) {
        try {
            if (resultSet.getMetaData().getColumnTypeName(c).equals("JSON")) {
                return resultSet.unwrap(OracleResultSet.class).getObject(c, OracleJsonObject.class);
            }
            return resultSet.getObject(c);
        } catch (SQLException e) {
            throw new RuntimeException("Something went wrong when getting object from result set");
        }
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
    public String getConnectionStringImpl(DataConnection conn) {
        conn.getPort();
        return "jdbc:oracle:thin:@(DESCRIPTION=" +
                "(ADDRESS=" +
                    "(PROTOCOL=" + (conn.ssl() ? "tcps" : "tcp") + ")" +
                    "(HOST=" + conn.getServer() + ")" +
                    "(PORT=" + conn.getPort() + "))" +
                "(CONNECT_DATA=(SERVICE_NAME=" + conn.getDb() + ")))";
    }

    @Override
    public String getSchemasSql(String db) {
        return "SELECT COL.OWNER as TABLE_SCHEMA FROM ALL_TAB_COLUMNS COL WHERE " + SYS_SCHEMAS_FILTER +
                " GROUP BY COL.OWNER ORDER BY COL.OWNER";
    }

    @Override
    public String getSchemaSql(String db, String schema, String table) {
        String whereClause = "WHERE " + SYS_SCHEMAS_FILTER;

        if (table != null)
            whereClause = whereClause + " AND (COL.TABLE_NAME = '" + table + "')";
        if (schema != null)
            whereClause = whereClause + " AND (COL.OWNER = '" + schema + "')";

        return "SELECT COL.OWNER as TABLE_SCHEMA, COL.TABLE_NAME AS TABLE_NAME, COL.COLUMN_NAME AS COLUMN_NAME, " +
                "CASE WHEN DATA_PRECISION IS NOT NULL AND DATA_SCALE IS NOT NULL " +
                "THEN CONCAT(COL.DATA_TYPE, CONCAT(CONCAT(CONCAT(CONCAT('(', DATA_PRECISION), ', '), DATA_SCALE), ')')) ELSE COL.DATA_TYPE END AS DATA_TYPE, " +
                "CASE WHEN O.OBJECT_TYPE = 'VIEW' THEN 1 ELSE 0 END AS IS_VIEW" +
                " FROM ALL_TAB_COLUMNS COL INNER JOIN ALL_OBJECTS O ON O.OBJECT_NAME = COL.TABLE_NAME " + whereClause +
                " ORDER BY TABLE_NAME";
    }

    @Override
    public String limitToSql(String query, Integer limit) {
        return String.format("SELECT * FROM (%s%s%s) WHERE ROWNUM <= %s", System.lineSeparator(),
                query, System.lineSeparator(), limit);
    }

    @Override
    public String addBrackets(String name) {
        String brackets = descriptor.nameBrackets;
        return name.startsWith(brackets.substring(0, 1)) ? name :
                brackets.charAt(0) + name + brackets.substring(brackets.length() - 1);
    }

    @Override
    public ResultSetManager getResultSetManager() {
        Map<String, ColumnManager<?>> defaultManagersMap = DefaultResultSetManager.getDefaultManagersMap();
        defaultManagersMap.put(Types.INT, new OracleSnowflakeIntColumnManager());
        defaultManagersMap.put(Types.BIG_INT, new OracleBigIntColumnManager());
        return new OracleResultSetManager(defaultManagersMap.values());
    }
}
