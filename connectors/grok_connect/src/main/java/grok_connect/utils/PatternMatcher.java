package grok_connect.utils;

import java.util.*;
import org.apache.commons.lang.*;


public class PatternMatcher {
    public static final String RANGE_NUM = "-";

    public static final String NONE = "none";
    public static final String CONTAINS = "contains";
    public static final String STARTS_WITH = "starts with";
    public static final String ENDS_WITH = "ends with";
    public static final String EQUALS = "equals";
    public static final String REGEXP = "regex";
    public static final String IN = "in";
    public static final String NOT_IN = "not in";
    public static final String BEFORE = "before";
    public static final String AFTER = "after";
    public static final String RANGE_DATE_TIME = "range";

    /// Expression as entered by user.
    public String expression;

    /// Operation (such as "EQUALS", "BEFORE", etc). [commonOption] contains list of available options.
    public String op;

    /// Column name this expression should be applied to; can be empty (for instance when used in search patterns).
    public String colName;

    public List<Object> values;

    public Boolean include1;
    public Boolean include2;

    @SuppressWarnings("unchecked")
    public PatternMatcher(Map matcher, String colName) {
        expression = (String)matcher.get("expression");
        op = (String)matcher.get("op");
        this.colName = colName;

        values = (List)getOptionalValue(matcher, "values");

        include1 = (Boolean)getOptionalValue(matcher, "include1");
        include2 = (Boolean)getOptionalValue(matcher, "include2");
    }

    private Object getOptionalValue(Map matcher, String key) {
        return matcher.containsKey(key) ? matcher.get(key) : null;
    }

    public String toSql(String type, String variable) {
        if (op.equals(NONE))
            return "(1 = 1)";

        if (type.equals("num") || type.equals("double") || type.equals("int")) {
            if (op.equals(RANGE_NUM))
                return "(" + variable + " >= " + values.get(0) + " AND " + variable + " <= " + values.get(1) + ")";
            else if (op.equals(IN))
                return "(" + variable + " IN " + "(" + StringUtils.join(values, ",") + "))";
            else if (op.equals(NOT_IN)) {
                return "(" + variable + " NOT IN " + "(" + StringUtils.join(values, ",") + "))";
            }
            return "(" + variable + op + values.get(0) + ")";
        } else if (type.equals("string")) {
            String val = ((String)values.get(0)).toLowerCase();
            if (op.equals(EQUALS))
                return "(LOWER(" + variable + ") LIKE '" + val + "')";
            else if (op.equals(CONTAINS))
                return "(LOWER(" + variable + ") LIKE '%" + val + "%')";
            else if (op.equals(STARTS_WITH))
                return "(LOWER(" + variable + ") LIKE '" + val + "%')";
            else if (op.equals(ENDS_WITH))
                return "(LOWER(" + variable + ") LIKE '%" + val + "')";
            else if (op.equals(REGEXP))
                return "(LOWER(" + variable + ") SIMILAR TO '" + val + "')";
            else if (op.equals(IN)) {
                List<String> _values = new ArrayList<>();
                for (Object v: values)
                    _values.add("'" + ((String)v).toLowerCase() + "'");
                return "(LOWER(" + variable + ") IN (" + StringUtils.join(_values, ",") + "))";
            } else
                throw new UnsupportedOperationException("Unknown operation " + op);
        } else if (type.equals("datetime")) {
            if (op.equals(EQUALS))
                return "(" + variable + " = '" + values.get(0) + "')";
            else if (op.equals(BEFORE))
                return "(" + variable + cmp(BEFORE, include1) + "'" + values.get(0) + "')";
            else if (op.equals(AFTER))
                return "(" + variable + cmp(AFTER, include1) + "'" + values.get(0) + "')";
            else if (op.equals(RANGE_DATE_TIME))
                return "((" + variable + cmp(AFTER, include1) + "'" + values.get(0) + "') AND (" +
                        variable + cmp(BEFORE, include1) + "'" + values.get(0) + "'))";
            else
                    throw new UnsupportedOperationException("Unknown operation " + op);
        } else {
            throw new UnsupportedOperationException();
        }
    }

    public static String cmp(String op, boolean include) {
        if (op.equals(PatternMatcher.BEFORE)) {
            return include ? " <= " : " < ";
        } else if (op.equals(PatternMatcher.AFTER)) {
            return include ? " >= " : " > ";
        } else {
            return "";
        }
    }
}
