package grok_connect.utils;

import com.zaxxer.hikari.HikariDataSource;
import com.zaxxer.hikari.pool.HikariPool;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import java.sql.Connection;
import java.sql.SQLException;
import java.util.Collections;
import java.util.HashMap;
import java.util.Map;
import java.util.Timer;
import java.util.TimerTask;

public class ConnectionPool {
    private static final Logger LOGGER = LoggerFactory.getLogger(ConnectionPool.class);
    private static volatile ConnectionPool instance;
    private final Map<String, HikariDataSourceInformation> connectionPool;
    private Timer timer;
    private TimerTask timerTask;

    private ConnectionPool() {
        connectionPool = Collections.synchronizedMap(new HashMap<>());
    }

    public static synchronized ConnectionPool getInstance() {
        LOGGER.debug("getInstance was called");
        if (instance == null) {
            instance = new ConnectionPool();
        }
        return instance;
    }

    public void setTimer() {

        if (timer == null)
            timer = new Timer("timer");

        if (timerTask != null)
            timerTask.cancel();

        timerTask = new TimerTask() {
            @Override
            public void run() {
                if (SettingsManager.getInstance().getSettings().debug) {
                    if (connectionPool.size() > 0)
                        System.out.println("Connection pool log:");
                    connectionPool.forEach((k, v) -> {
                        System.out.println("Pool: " + v.hikariDataSource.getPoolName());
                        System.out.println("Active: " + v.poolProxy.getActiveConnections());
                        System.out.println("Idle: " +v.poolProxy.getIdleConnections());
                    });
                }
            }
        };

        timer.scheduleAtFixedRate(timerTask,
                SettingsManager.getInstance().getSettings().connectionPoolTimerRate,
                SettingsManager.getInstance().getSettings().connectionPoolTimerRate);
    }

    public Connection getConnection(String url, java.util.Properties properties, String driverClassName)
            throws GrokConnectException {
        try {
            LOGGER.debug("getConnection was called for driver {} with url {}", driverClassName, url);
            if (url == null || properties == null || driverClassName == null)
                throw new GrokConnectException("Connection parameters are null");
            String key = url + properties + driverClassName;
            synchronized(this) {
                if (!connectionPool.containsKey(key)) {
                    LOGGER.debug("Creating new pool");
                    connectionPool.put(key, new HikariDataSourceInformation(url, properties, driverClassName));
                }
                HikariDataSource hikariDataSource = connectionPool.get(key).hikariDataSource;
                LOGGER.debug("Pool {} active connections count: {}", hikariDataSource.getPoolName(),
                        hikariDataSource.getHikariPoolMXBean().getActiveConnections());
                LOGGER.debug("Pool {} idle connections count: {}", hikariDataSource.getPoolName(),
                        hikariDataSource.getHikariPoolMXBean().getIdleConnections());
                LOGGER.debug("Pool {} total connections count: {}", hikariDataSource.getPoolName(),
                        hikariDataSource.getHikariPoolMXBean().getTotalConnections());
                LOGGER.debug("Pool {} threads awaiting connection count: {}", hikariDataSource.getPoolName(),
                        hikariDataSource.getHikariPoolMXBean().getThreadsAwaitingConnection());
                return hikariDataSource.getConnection();
            }
        } catch (SQLException e) {
            throw new GrokConnectException(e);
        } catch (HikariPool.PoolInitializationException e) {
            throw new GrokConnectException(e.getCause());
        }
    }

    public Map<String, Connection> nativeConnectionsConnectionPool = Collections.synchronizedMap(new HashMap<>());

    Connection getNativeConnection(String url, java.util.Properties info, String driverClassName) {
        LOGGER.debug("getNativeConnection was called for driver {} with url {}", driverClassName, url);
        String key = url + info + driverClassName;
        if (url != null && info != null && driverClassName != null && nativeConnectionsConnectionPool.containsKey(key)) {
            Connection conn = nativeConnectionsConnectionPool.get(key);
            try {
                if (!conn.isClosed())
                    return nativeConnectionsConnectionPool.get(key);
            } catch (SQLException throwables) {
                LOGGER.warn("An exception was thrown", throwables);
            }
        }
        return null;
    }

    void putNativeConnection(Connection conn, String url, java.util.Properties info, String driverClassName) {
        if (url != null && info != null && driverClassName != null)
            nativeConnectionsConnectionPool.put(url + info + driverClassName, conn);
    }
}
