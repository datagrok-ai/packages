package grok_connect.providers;

import grok_connect.connectors_info.Credentials;
import grok_connect.connectors_info.DataConnection;
import grok_connect.connectors_info.DbCredentials;
import grok_connect.providers.utils.ConstructorParameterResolver;
import grok_connect.providers.utils.DataFrameComparator;
import grok_connect.providers.utils.Provider;
import grok_connect.utils.GrokConnectException;
import grok_connect.utils.ProviderManager;
import grok_connect.utils.SettingsManager;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.MethodOrderer;
import org.junit.jupiter.api.Order;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestInstance;
import org.junit.jupiter.api.TestMethodOrder;
import org.junit.jupiter.api.extension.ExtendWith;
import org.testcontainers.containers.JdbcDatabaseContainer;

/**
 * Base test class for providers, has common tests, fields and lifecycle
  */
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
@ExtendWith(ConstructorParameterResolver.class)
public abstract class ContainerizedProviderBaseTest {
    private final Provider type;
    protected JdbcDatabaseContainer<?> container;
    protected JdbcDataProvider provider;
    protected Credentials credentials;
    protected DataConnection connection;
    protected DataFrameComparator dataFrameComparator;

    protected ContainerizedProviderBaseTest(Provider type) {
        this.container = type.getContainer();
        this.type = type;
        dataFrameComparator = new DataFrameComparator();
    }

    @BeforeAll
    public void init() {
        SettingsManager settingsManager = SettingsManager.getInstance();
        settingsManager.initSettingsWithDefaults();
        ProviderManager providerManager = new ProviderManager();
        provider = providerManager.getByName(type.getProperties().get("providerName").toString());
    }

    @BeforeEach
    public void beforeEach() {
        credentials = new Credentials();
        credentials.parameters.put(DbCredentials.LOGIN, container.getUsername());
        credentials.parameters.put(DbCredentials.PASSWORD, container.getPassword());
        connection = new DataConnection();
        connection.credentials = credentials;
        connection.dataSource = provider.descriptor.type;
        connection.parameters.put(DbCredentials.SERVER, container.getHost());
        connection.parameters.put(DbCredentials.PORT, (double) container.getFirstMappedPort());
        connection.parameters.put(DbCredentials.DB, container.getDatabaseName());
    }

    @DisplayName("Test whether container with db is running")
    @Order(1)
    @Test
    public void database_isRunning_ok() {
        Assertions.assertTrue(container.isRunning());
    }

    @DisplayName("Tests of testConnection(DataConnection conn)")
    @Order(2)
    @Test
    public void testConnection() {
        Assertions.assertDoesNotThrow(() -> provider.testConnection(connection));
    }

    // I think, it would be better to implement some Global exception handler
    // and not return String, when something went wrong in this method
    @DisplayName("Test of testConnection(DataConnection conn) when no credentials provided")
    @Order(3)
    @Test
    public void testConnection_notOk() {
        connection.credentials = null;
        Assertions.assertThrows(GrokConnectException.class, () -> provider.testConnection(connection));
    }

    @AfterAll
    public void destroy() {
        container.stop();
    }
}
