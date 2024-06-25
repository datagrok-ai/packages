package grok_connect.providers;

import grok_connect.connectors_info.Credentials;
import grok_connect.connectors_info.DataConnection;
import grok_connect.connectors_info.DbCredentials;
import grok_connect.connectors_info.FuncCall;
import grok_connect.providers.utils.DataFrameComparator;
import grok_connect.providers.utils.NamedArgumentConverter;
import grok_connect.providers.utils.Provider;
import grok_connect.utils.GrokConnectException;
import grok_connect.utils.ProviderManager;
import grok_connect.utils.SettingsManager;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Disabled;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestInstance;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.converter.ConvertWith;
import org.junit.jupiter.params.provider.MethodSource;
import org.mockito.Mockito;
import org.testcontainers.containers.CassandraContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import serialization.DataFrame;

@TestInstance(TestInstance.Lifecycle.PER_CLASS)
@Testcontainers
class CassandraDataProviderTest {
    private static final Provider type = Provider.CASSANDRA;
    private static final int CASSANDRA_PORT = 9042;
    private static final String SCRIPT_PATH = "scripts/cassandra/init.cql";
    private static final String KEYSPACE = "datagrok";
    @Container
    private static final CassandraContainer<?> container
            = new CassandraContainer<>(type.getProperties().get("image").toString())
            .withConfigurationOverride("scripts/cassandra/etc/cassandra")
            .withInitScript(SCRIPT_PATH)
            .withExposedPorts(CASSANDRA_PORT);
    private JdbcDataProvider provider;
    private DataConnection connection;
    private DataFrameComparator dataFrameComparator;

    @BeforeAll
    public void init() {
        dataFrameComparator = new DataFrameComparator();
        SettingsManager settingsManager = SettingsManager.getInstance();
        settingsManager.initSettingsWithDefaults();
        ProviderManager providerManager = new ProviderManager();
        ProviderManager spy = Mockito.spy(providerManager);
        provider = spy.getByName(type.getProperties().get("providerName").toString());
    }

    @BeforeEach
    public void beforeEach() {
        Credentials credentials = new Credentials();
        credentials.parameters.put(DbCredentials.LOGIN, container.getUsername());
        credentials.parameters.put(DbCredentials.PASSWORD, container.getPassword());
        connection = new DataConnection();
        connection.credentials = credentials;
        connection.dataSource = provider.descriptor.type;
        connection.parameters.put(DbCredentials.KEYSPACE, KEYSPACE);
        connection.parameters.put(DbCredentials.SERVER, container.getHost());
        connection.parameters.put(DbCredentials.PORT, container.getMappedPort(CASSANDRA_PORT).doubleValue());
    }

    @DisplayName("Tests of testConnection(DataConnection conn)")
    @Test
    public void testConnection() {
        Assertions.assertDoesNotThrow(() -> provider.testConnection(connection));
    }

    @DisplayName("Test of testConnection(DataConnection conn) when some parameters are missing")
    @Test
    public void testConnection_notOk() {
        connection.parameters.clear();
        Assertions.assertThrows(GrokConnectException.class, () -> provider.testConnection(connection));
    }

    @DisplayName("Test of getSchemas() method with correct DataConnection")
    @ParameterizedTest(name = "CORRECT ARGUMENTS")
    @MethodSource("grok_connect.providers.arguments_provider.CassandraObjectsMother#getSchemas_ok")
    public void getSchemas_ok(DataFrame expected) {
        DataFrame actual = Assertions.assertDoesNotThrow(() -> provider.getSchemas(connection));
        Assertions.assertTrue(dataFrameComparator.isDataFramesEqual(expected, actual));
    }

    @Disabled
    @Test
    public void getSchemas_notOk() {
        // method probably should throw something when bad input
    }

    @DisplayName("Test of getSchema() method with correct DataConnection")
    @ParameterizedTest(name = "CORRECT ARGUMENTS")
    @MethodSource("grok_connect.providers.arguments_provider.CassandraObjectsMother#getSchema_ok")
    public void getSchema_ok(DataFrame expected) {
        DataFrame actual = Assertions.assertDoesNotThrow(() -> provider.getSchema(connection,
                KEYSPACE, "mock_data"));
        Assertions.assertTrue(dataFrameComparator.isDataFramesEqual(expected, actual));
    }

    @DisplayName("Parameters support")
    @ParameterizedTest(name = "{index} : {0}")
    @MethodSource({"grok_connect.providers.arguments_provider.CassandraObjectsMother#checkParameterSupport_ok",
            "grok_connect.providers.arguments_provider.CassandraObjectsMother#checkMultipleParametersSupport_ok"})
    public void checkParameterSupport_ok(@ConvertWith(NamedArgumentConverter.class) FuncCall funcCall, DataFrame expected) {
        funcCall.func.connection = connection;
        DataFrame actual = Assertions.assertDoesNotThrow(() -> provider.execute(funcCall));
        Assertions.assertTrue(dataFrameComparator.isDataFramesEqual(expected, actual));
    }

    @DisplayName("Parameters support for datetime")
    @ParameterizedTest(name = "{index} : {0}")
    @MethodSource("grok_connect.providers.arguments_provider.CassandraObjectsMother#checkDatesParameterSupport_ok")
    public void checkDatesParameterSupport_ok(@ConvertWith(NamedArgumentConverter.class) FuncCall funcCall, DataFrame expected) {
        funcCall.func.connection = connection;
        DataFrame actual = Assertions.assertDoesNotThrow(() -> provider.execute(funcCall));
        Assertions.assertTrue(dataFrameComparator.isDataFramesEqual(expected, actual));
    }

    @DisplayName("Output support of integer types")
    @ParameterizedTest(name = "{index} : {0}")
    @MethodSource("grok_connect.providers.arguments_provider.CassandraObjectsMother#checkIntegerTypesSupport_ok")
    public void checkIntegerTypesSupport_ok(@ConvertWith(NamedArgumentConverter.class) FuncCall funcCall, DataFrame expected) {
        funcCall.func.connection = connection;
        DataFrame actual = Assertions.assertDoesNotThrow(() -> provider.execute(funcCall));
        Assertions.assertTrue(dataFrameComparator.isDataFramesEqual(expected, actual));
    }

    @DisplayName("Output support of float types")
    @ParameterizedTest(name = "{index} : {0}")
    @MethodSource("grok_connect.providers.arguments_provider.CassandraObjectsMother#checkFloatTypesSupport_ok")
    public void checkFloatTypesSupport_ok(@ConvertWith(NamedArgumentConverter.class) FuncCall funcCall, DataFrame expected) {
        funcCall.func.connection = connection;
        DataFrame actual = Assertions.assertDoesNotThrow(() -> provider.execute(funcCall));
        Assertions.assertTrue(dataFrameComparator.isDataFramesEqual(expected, actual));
    }

    @DisplayName("Output support of date types")
    @ParameterizedTest(name = "{index} : {0}")
    @MethodSource("grok_connect.providers.arguments_provider.CassandraObjectsMother#checkDateTypesSupport_ok")
    public void checkDateTypesSupport_ok(@ConvertWith(NamedArgumentConverter.class) FuncCall funcCall, DataFrame expected) {
        funcCall.func.connection = connection;
        DataFrame actual = Assertions.assertDoesNotThrow(() -> provider.execute(funcCall));
        Assertions.assertTrue(dataFrameComparator.isDataFramesEqual(expected, actual));
    }

    @DisplayName("Output support of complex types")
    @ParameterizedTest(name = "{index} : {0}")
    @MethodSource("grok_connect.providers.arguments_provider.CassandraObjectsMother#checkComplexTypesSupport_ok")
    public void checkComplexTypesSupport_ok(@ConvertWith(NamedArgumentConverter.class) FuncCall funcCall, DataFrame expected) {
        funcCall.func.connection = connection;
        DataFrame actual = Assertions.assertDoesNotThrow(() -> provider.execute(funcCall));
        Assertions.assertTrue(dataFrameComparator.isDataFramesEqual(expected, actual));
    }
}
