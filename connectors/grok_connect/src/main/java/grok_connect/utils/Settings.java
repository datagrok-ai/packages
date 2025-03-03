package grok_connect.utils;

public class Settings {
    public int connectionPoolMaximumPoolSize;
    public int connectionPoolIdleTimeout;

    public Settings(int connectionPoolMaximumPoolSize, int connectionPoolIdleTimeout) {
        this.connectionPoolMaximumPoolSize = connectionPoolMaximumPoolSize;
        this.connectionPoolIdleTimeout = connectionPoolIdleTimeout;
    }
}
