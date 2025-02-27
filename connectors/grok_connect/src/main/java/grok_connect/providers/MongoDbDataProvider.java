package grok_connect.providers;

import grok_connect.managers.ColumnManager;
import grok_connect.managers.complex_column.Neo4jComplexColumnManager;
import grok_connect.connectors_info.DataConnection;
import grok_connect.connectors_info.DataQuery;
import grok_connect.connectors_info.DataSource;
import grok_connect.connectors_info.DbCredentials;
import grok_connect.connectors_info.FuncCall;
import grok_connect.resultset.DefaultResultSetManager;
import grok_connect.resultset.ResultSetManager;
import grok_connect.utils.GrokConnectException;
import grok_connect.utils.QueryCancelledByUser;
import org.slf4j.Logger;
import serialization.DataFrame;
import serialization.Types;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.Map;

public class MongoDbDataProvider extends JdbcDataProvider {
    private static final int OBJECT_INDEX = 1;

    public MongoDbDataProvider() {
        driverClassName = "com.dbschema.MongoJdbcDriver";
        descriptor = new DataSource();
        descriptor.type = "MongoDB";
        descriptor.description = "Query MongoDB database";
        descriptor.connectionTemplate = DbCredentials.dbConnectionTemplate;
        descriptor.credentialsTemplate = DbCredentials.dbCredentialsTemplate;
        descriptor.aggregations = null;
    }

    @Override
    public String getConnectionStringImpl(DataConnection conn) {
        String port = (conn.getPort() == null) ? "" : ":" + conn.getPort();
        return "jdbc:mongodb://" + conn.getServer() + port + "/" + conn.getDb();
    }

    @Override
    public DataFrame execute(FuncCall queryRun)
            throws GrokConnectException, QueryCancelledByUser {
        DataQuery dataQuery = queryRun.func;
        try (Connection connection = getConnection(dataQuery.connection);
             ResultSet resultSet = getResultSet(queryRun, connection,1)) {
            ResultSetManager resultSetManager = getResultSetManager();
            resultSetManager.init(resultSet.getMetaData(), 100);
            return getResultSetSubDf(queryRun, resultSet, resultSetManager,-1, 1,
                    0, false);
        } catch (SQLException e) {
            throw new GrokConnectException(e);
        }
    }

    @Override
    public ResultSet getResultSet(FuncCall queryRun, Connection connection, int fetchSize) throws SQLException {
        PreparedStatement statement = connection.prepareStatement(queryRun.func.query);
        return statement.executeQuery();
    }

    @Override
    public DataFrame getResultSetSubDf(FuncCall queryRun, ResultSet resultSet, ResultSetManager resultSetManager, int maxIterations, int columnCount,
                                       int operationNumber, boolean dryRun) throws SQLException {
        while (resultSet.next()) {
            Object object = resultSet.getObject(OBJECT_INDEX);
            resultSetManager.processValue(object, OBJECT_INDEX);
        }
        resultSet.close();
        DataFrame dataFrame = new DataFrame();
        dataFrame.addColumns(resultSetManager.getProcessedColumns());
        return dataFrame;
    }

    @Override
    public ResultSetManager getResultSetManager() {
        Map<String, ColumnManager<?>> defaultManagersMap = DefaultResultSetManager.getDefaultManagersMap();
        defaultManagersMap.put(Types.COLUMN_LIST, new Neo4jComplexColumnManager());
        return DefaultResultSetManager.fromManagersMap(defaultManagersMap);
    }
}
