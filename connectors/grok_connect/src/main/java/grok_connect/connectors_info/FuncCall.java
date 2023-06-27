package grok_connect.connectors_info;

import java.util.*;


public class FuncCall
{
    public String id;
    public DataQuery func;
    public Map options;
    public Map<String, Object> parameterValues = new HashMap<>();
    public Map<String, Object> aux = new HashMap<>();
    public String log;
    public boolean debugQuery;
    public List<String> printLevels;

    public void setParamValues() {
        for (String paramName: parameterValues.keySet()) {
            for (FuncParam param: func.getInputParams()) {
                if (param.name.equals(paramName)) {
                    param.setValue(parameterValues.get(paramName));
                    break;
                }
            }
        }
    }

    public void afterDeserialization() {
        Boolean debugQuery = (Boolean) aux.get("debugQuery");
        if (debugQuery == null)
            debugQuery = false;

        this.debugQuery = debugQuery;
    }
}
