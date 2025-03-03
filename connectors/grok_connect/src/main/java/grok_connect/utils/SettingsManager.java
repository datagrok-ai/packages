package grok_connect.utils;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class SettingsManager {
    public static final int DEFAULT_CONNECTION_POOL_MAXIMUM_SIZE = 30;
    public static final int DEFAULT_CONNECTION_POOL_IDLE_TIMEOUT = 5*60*1000;
    private static final Logger LOGGER = LoggerFactory.getLogger(SettingsManager.class);
    private static volatile SettingsManager instance;

    private Settings settings;

    private SettingsManager() {
    }

    public static synchronized SettingsManager getInstance() {
        LOGGER.debug("getInstance was called");
        if (instance == null) {
            LOGGER.debug("Initializing new instance");
            instance = new SettingsManager();
            instance.initSettingsWithDefaults();
        }
        return instance;
    }

    public void initSettings(
                             int connectionPoolMaximumPoolSize, int connectionPoolIdleTimeout) {
        LOGGER.trace("initSettings was called with arguments: "
                        + "connectionPoolMaximumPoolSize: {}, connectionPoolIdleTimeout: {}",
                connectionPoolMaximumPoolSize, connectionPoolIdleTimeout);
        this.settings = new Settings(connectionPoolMaximumPoolSize, connectionPoolIdleTimeout);
    }

    public void initSettingsWithDefaults() {
        LOGGER.trace("Initializing instance with defaults");
        initSettings(DEFAULT_CONNECTION_POOL_MAXIMUM_SIZE, DEFAULT_CONNECTION_POOL_IDLE_TIMEOUT);
    }

    public Settings getSettings() {
        return settings;
    }

    public void setSettings(Settings settings) {
        this.settings = settings;
    }
}
