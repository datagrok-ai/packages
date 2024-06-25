package grok_connect.providers;

import java.sql.PreparedStatement;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.util.ArrayList;
import java.util.Calendar;
import java.util.Map;

import grok_connect.managers.ColumnManager;
import grok_connect.managers.bigint_column.Neo4jBigIntColumnManager;
import grok_connect.managers.complex_column.Neo4jComplexColumnManager;
import grok_connect.managers.integer_column.Neo4jIntColumnManager;
import grok_connect.connectors_info.DataConnection;
import grok_connect.connectors_info.DataSource;
import grok_connect.connectors_info.DbCredentials;
import grok_connect.connectors_info.FuncParam;
import grok_connect.resultset.DefaultResultSetManager;
import grok_connect.resultset.ResultSetManager;
import grok_connect.utils.GrokConnectException;
import grok_connect.utils.PatternMatcher;
import grok_connect.utils.PatternMatcherResult;
import grok_connect.utils.Property;
import serialization.Types;

public class Neo4jDataProvider extends JdbcDataProvider {

    public Neo4jDataProvider() {
        driverClassName = "org.neo4j.jdbc.Driver";
        descriptor = new DataSource();
        descriptor.type = "Neo4j";
        descriptor.description = "Query Neo4j database";
        descriptor.commentStart = "//";
        descriptor.connectionTemplate = new ArrayList<>(DbCredentials.dbConnectionTemplate);
        descriptor.connectionTemplate.add(new Property(Property.BOOL_TYPE, DbCredentials.SSL));
        descriptor.credentialsTemplate = DbCredentials.dbCredentialsTemplate;
        descriptor.aggregations = null;
    }

    @Override
    public String getConnectionString(DataConnection conn) {
        String connString = super.getConnectionString(conn);
        if (!conn.hasCustomConnectionString() && !conn.ssl())
            connString += "?nossl";
        return connString;
    }

    @Override
    public void prepareProvider() throws GrokConnectException {
        try {
            Class.forName("org.neo4j.jdbc.bolt.BoltDriver");
            Class.forName("org.neo4j.jdbc.boltrouting.BoltRoutingNeo4jDriver");
            Class.forName("org.neo4j.jdbc.http.HttpDriver");
        } catch (ClassNotFoundException e) {
            throw new GrokConnectException(e);
        }
    }

    @Override
    public String getConnectionStringImpl(DataConnection conn) {
        String port = (conn.getPort() == null) ? "" : ":" + conn.getPort();
        return "jdbc:neo4j:bolt://" + conn.getServer() + port + "/" + conn.getDb();
    }

    @Override
    protected String getInQuery(PatternMatcher matcher, String names) {
        if (matcher.op.equals(PatternMatcher.IN)) {
            return String.format("(%s %s [%s])", matcher.colName, matcher.op, names);
        }
        return String.format("(NOT %s IN [%s])", matcher.colName, names);
    }

    @Override
    protected String getRegexQuery(String columnName, String regexExpression) {
        return String.format("%s =~ '%s'", columnName, regexExpression);
    }

    @Override
    public PatternMatcherResult stringPatternConverter(FuncParam param, PatternMatcher matcher) {
        PatternMatcherResult result = new PatternMatcherResult();
        String type = "string";
        String formatQuery = "(toLower(%s) %s toLower(@%s))";
        String value = (matcher.values.get(0)).toLowerCase();
        switch (matcher.op) {
            case PatternMatcher.EQUALS:
                result.setQuery(String.format(formatQuery, matcher.colName, "=", param.name));
                result.addParam(new FuncParam(type, param.name, value));
                break;
            case PatternMatcher.CONTAINS:
                result.setQuery(String.format(formatQuery, matcher.colName, PatternMatcher.CONTAINS, param.name));
                result.addParam(new FuncParam(type, param.name, value));
                break;
            case PatternMatcher.STARTS_WITH:
                result.setQuery(String.format(formatQuery, matcher.colName, PatternMatcher.STARTS_WITH, param.name));
                result.addParam(new FuncParam(type, param.name, value));
                break;
            case PatternMatcher.ENDS_WITH:
                result.setQuery(String.format(formatQuery, matcher.colName, PatternMatcher.ENDS_WITH, param.name));
                result.addParam(new FuncParam(type, param.name, value));
                break;
            case PatternMatcher.REGEXP:
                result.setQuery(getRegexQuery(matcher.colName, value));
                result.addParam(new FuncParam(type, param.name, value));
                break;
            case PatternMatcher.IN:
            case PatternMatcher.NOT_IN:
                String names = paramToNamesString(param, matcher, type, result);
                result.setQuery(getInQuery(matcher, names));
                break;
            default:
                result.query = "(1 = 1)";
                break;
        }
        return result;
    }

    @Override
    public PatternMatcherResult dateTimePatternConverter(FuncParam param, PatternMatcher matcher) {
        PatternMatcherResult result = new PatternMatcherResult();
        String compareString =
                String.format("localdatetime({year:%s.year, month:%s.month, day:%s.day})",
                        matcher.colName, matcher.colName, matcher.colName);
        String queryFormat = "(%s %s @%s)";
        switch (matcher.op) {
            case PatternMatcher.EQUALS:
                result.setQuery(String.format(queryFormat, compareString, "=", param.name));
                result.addParam(new FuncParam("datetime", param.name, matcher.values.get(0)));
                break;
            case PatternMatcher.BEFORE:
            case PatternMatcher.AFTER:
                result.setQuery(String.format(queryFormat, compareString,
                        PatternMatcher.cmp(matcher.op, matcher.include1), param.name));
                result.addParam(new FuncParam("datetime", param.name, matcher.values.get(0)));
                break;
            case PatternMatcher.RANGE_DATE_TIME:
                String name0 = param.name + "R0";
                String name1 = param.name + "R1";
                result.setQuery(String.format("(%s %s @%s AND %s %s @%s)", compareString,
                                PatternMatcher.cmp(PatternMatcher.AFTER, matcher.include1),
                                name0, compareString, PatternMatcher.cmp(PatternMatcher.BEFORE, matcher.include2), name1));
                result.addParam(new FuncParam("datetime", name0, matcher.values.get(0)));
                result.addParam(new FuncParam("datetime", name1, matcher.values.get(1)));
                break;
            case PatternMatcher.NONE:
            default:
                result.setQuery("(1 = 1)");
                break;
        }
        return result;
    }

    @Override
    public ResultSetManager getResultSetManager() {
        Map<String, ColumnManager<?>> defaultManagersMap = DefaultResultSetManager.getDefaultManagersMap();
        defaultManagersMap.put(Types.COLUMN_LIST, new Neo4jComplexColumnManager());
        defaultManagersMap.put(Types.INT, new Neo4jIntColumnManager());
        defaultManagersMap.put(Types.BIG_INT, new Neo4jBigIntColumnManager());
        return DefaultResultSetManager.fromManagersMap(defaultManagersMap);
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
