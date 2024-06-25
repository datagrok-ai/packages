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
import org.junit.jupiter.api.MethodOrderer;
import org.junit.jupiter.api.Order;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestInstance;
import org.junit.jupiter.api.TestMethodOrder;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.converter.ConvertWith;
import org.junit.jupiter.params.provider.MethodSource;
import org.testcontainers.containers.ContainerState;
import org.testcontainers.containers.DockerComposeContainer;
import org.testcontainers.containers.wait.strategy.Wait;
import org.testcontainers.containers.wait.strategy.WaitAllStrategy;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import serialization.DataFrame;
import java.io.File;
import java.io.IOException;
import java.time.Duration;
import java.util.Optional;

/**
 * Test class for Hive2Provider.
 */
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
@Testcontainers
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
class Hive2DataProviderTest {
    private static final Provider type = Provider.HIVE2;
    private static final String SERVICE_NAME = "hive-server";
    private static final int SERVICE_PORT = 10000;
    private static final int WAITING_TIME = 180;

    @Container
    private static final DockerComposeContainer<?> dockerComposeContainer =
            new DockerComposeContainer<>(new File("src/test/resources/scripts/hive2/docker-compose.yml"))
                    .withExposedService(SERVICE_NAME, SERVICE_PORT,
                            Wait.forListeningPort().withStartupTimeout(Duration.ofSeconds(WAITING_TIME)));

    private JdbcDataProvider provider;
    private DataConnection connection;
    private DataFrameComparator dataFrameComparator;
    private ContainerState hiveServiceContainerState;

    @BeforeAll
    public void init() {
        dataFrameComparator = new DataFrameComparator();
        SettingsManager settingsManager = SettingsManager.getInstance();
        settingsManager.initSettingsWithDefaults();
        ProviderManager providerManager = new ProviderManager();
        provider = providerManager.getByName(type.getProperties().get("providerName").toString());
        dockerComposeContainer.waitingFor(SERVICE_NAME, new WaitAllStrategy());
        Optional<ContainerState> hiveServer = dockerComposeContainer.getContainerByServiceName(SERVICE_NAME);
        if (hiveServer.isPresent()) {
            hiveServiceContainerState = hiveServer.get();
            try {
                hiveServiceContainerState.execInContainer("/opt/hive/bin/hive", "-f",
                        "../scripts/hive_all.hql");
            } catch (IOException | InterruptedException e) {
                throw new RuntimeException("Something went wrong when executing init script", e);
            }
        }
    }

    @BeforeEach
    public void beforeEach() {
        Credentials credentials = new Credentials();
        credentials.parameters.put(DbCredentials.LOGIN, null);
        credentials.parameters.put(DbCredentials.PASSWORD, null);
        connection = new DataConnection();
        connection.credentials = credentials;
        connection.dataSource = provider.descriptor.type;
        connection.parameters.put(DbCredentials.DB, type.getProperties().getProperty("database"));
        connection.parameters.put(DbCredentials.SERVER,
                dockerComposeContainer.getServiceHost(SERVICE_NAME, SERVICE_PORT));
        connection.parameters.put(DbCredentials.PORT,
                (double) dockerComposeContainer.getServicePort(SERVICE_NAME, SERVICE_PORT));
    }

    @Order(1)
    @DisplayName("Test whether container with db is running")
    @Test
    public void docker_isRunning_ok() {
        Assertions.assertTrue(hiveServiceContainerState.isRunning());
    }

    @Order(2)
    @DisplayName("Tests of testConnection(DataConnection conn)")
    @Test
    public void testConnection() {
        Assertions.assertDoesNotThrow(() -> provider.testConnection(connection));
    }

    @Order(3)
    @DisplayName("Test of testConnection(DataConnection conn) when wrong db")
    @Test
    public void testConnection_notOk() {
        connection.parameters.put(DbCredentials.DB, "dummyFooBar");
        Assertions.assertThrows(GrokConnectException.class, () -> provider.testConnection(connection));
    }

    @DisplayName("Test of getSchemas() method with correct DataConnection")
    @ParameterizedTest(name = "CORRECT ARGUMENTS")
    @MethodSource("grok_connect.providers.arguments_provider.Hive2ObjectsMother#getSchemas_ok")
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
    @MethodSource("grok_connect.providers.arguments_provider.Hive2ObjectsMother#getSchema_ok")
    public void getSchema_ok(DataFrame expected) {
        DataFrame actual = Assertions.assertDoesNotThrow(() -> provider.getSchema(connection,
                "datagrok", "mock_data"));
        Assertions.assertTrue(dataFrameComparator.isDataFramesEqual(expected, actual));
    }

    @Disabled
    @Test
    public void getSchema_notOk() {
        // method probably should throw something when bad input
    }

    @DisplayName("Parameters support")
    @ParameterizedTest(name = "{index} : {0}")
    @MethodSource({"grok_connect.providers.arguments_provider.Hive2ObjectsMother#checkParameterSupport_ok",
            "grok_connect.providers.arguments_provider.Hive2ObjectsMother#checkMultipleParametersSupport_ok",
            "grok_connect.providers.arguments_provider.Hive2ObjectsMother#checkListParameterSupport_ok",
            "grok_connect.providers.arguments_provider.Hive2ObjectsMother#checkRegexSupport_ok"})
    public void checkParameterSupport_ok(@ConvertWith(NamedArgumentConverter.class) FuncCall funcCall, DataFrame expected) {
        funcCall.func.connection = connection;
        DataFrame actual = Assertions.assertDoesNotThrow(() -> provider.execute(funcCall));
        Assertions.assertTrue(dataFrameComparator.isDataFramesEqual(expected, actual));
    }

    @DisplayName("Parameters support for datetime")
    @ParameterizedTest(name = "{index} : {0}")
    @MethodSource("grok_connect.providers.arguments_provider.Hive2ObjectsMother#checkDatesParameterSupport_ok")
    public void checkDatesParameterSupport_ok(@ConvertWith(NamedArgumentConverter.class) FuncCall funcCall, DataFrame expected) {
        funcCall.func.connection = connection;
        DataFrame actual = Assertions.assertDoesNotThrow(() -> provider.execute(funcCall));
        Assertions.assertTrue(dataFrameComparator.isDataFramesEqual(expected, actual));
    }

    @DisplayName("Output support for integer types")
    @ParameterizedTest(name = "{index} : {0}")
    @MethodSource("grok_connect.providers.arguments_provider.Hive2ObjectsMother#checkOutputDataFrame_integerTypes_ok")
    public void checkOutputDataFrame_integerTypes_ok(@ConvertWith(NamedArgumentConverter.class) FuncCall funcCall, DataFrame expected) {
        funcCall.func.connection = connection;
        DataFrame actual = Assertions.assertDoesNotThrow(() -> provider.execute(funcCall));
        Assertions.assertTrue(dataFrameComparator.isDataFramesEqual(expected, actual));
    }

    @DisplayName("Output support for float types")
    @ParameterizedTest(name = "{index} : {0}")
    @MethodSource("grok_connect.providers.arguments_provider.Hive2ObjectsMother#checkOutputDataFrame_floatTypes_ok")
    public void checkOutputDataFrame_floatTypes_ok(@ConvertWith(NamedArgumentConverter.class) FuncCall funcCall, DataFrame expected) {
        funcCall.func.connection = connection;
        DataFrame actual = Assertions.assertDoesNotThrow(() -> provider.execute(funcCall));
        Assertions.assertTrue(dataFrameComparator.isDataFramesEqual(expected, actual));
    }

    @DisplayName("Output support for character types")
    @ParameterizedTest(name = "{index} : {0}")
    @MethodSource("grok_connect.providers.arguments_provider.Hive2ObjectsMother#checkOutputDataFrame_characterTypes_ok")
    public void checkOutputDataFrame_characterTypes_ok(@ConvertWith(NamedArgumentConverter.class) FuncCall funcCall, DataFrame expected) {
        funcCall.func.connection = connection;
        DataFrame actual = Assertions.assertDoesNotThrow(() -> provider.execute(funcCall));
        Assertions.assertTrue(dataFrameComparator.isDataFramesEqual(expected, actual));
    }

    @DisplayName("Output support for date types")
    @ParameterizedTest(name = "{index} : {0}")
    @MethodSource("grok_connect.providers.arguments_provider.Hive2ObjectsMother#checkOutputDataFrame_dateTypes_ok")
    public void checkOutputDataFrame_dateTypes_ok(@ConvertWith(NamedArgumentConverter.class) FuncCall funcCall, DataFrame expected) {
        funcCall.func.connection = connection;
        DataFrame actual = Assertions.assertDoesNotThrow(() -> provider.execute(funcCall));
        Assertions.assertTrue(dataFrameComparator.isDataFramesEqual(expected, actual));
    }

    @DisplayName("Output support for complex types")
    @ParameterizedTest(name = "{index} : {0}")
    @MethodSource("grok_connect.providers.arguments_provider.Hive2ObjectsMother#checkOutputDataFrame_complexTypes_ok")
    public void checkOutputDataFrame_complexTypes_ok(@ConvertWith(NamedArgumentConverter.class) FuncCall funcCall, DataFrame expected) {
        funcCall.func.connection = connection;
        DataFrame actual = Assertions.assertDoesNotThrow(() -> provider.execute(funcCall));
        Assertions.assertTrue(dataFrameComparator.isDataFramesEqual(expected, actual));
    }
}
