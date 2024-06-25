package grok_connect.providers;

import grok_connect.GrokConnect;
import grok_connect.connectors_info.Credentials;
import grok_connect.connectors_info.DataConnection;
import grok_connect.connectors_info.DbCredentials;
import grok_connect.connectors_info.FuncCall;
import grok_connect.providers.utils.DataFrameComparator;
import grok_connect.providers.utils.NamedArgumentConverter;
import grok_connect.providers.utils.Provider;
import grok_connect.utils.ProviderManager;
import grok_connect.utils.SettingsManager;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.MethodOrderer;
import org.junit.jupiter.api.Order;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestInstance;
import org.junit.jupiter.api.TestMethodOrder;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.converter.ConvertWith;
import org.junit.jupiter.params.provider.MethodSource;
import org.testcontainers.containers.Neo4jContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.utility.MountableFile;
import serialization.DataFrame;
import java.io.IOException;

@Testcontainers
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
class Neo4jDataProviderTest {
    private static final Provider type = Provider.NEO4J;
    private static final String HOST_SCRIPT_PATH = "scripts/neo4j/neo4j_all.cypher";
    private static final String CONTAINER_SCRIPT_PATH = "/var/lib/neo4j/neo4j_all.cypher";
    @Container
    private static final Neo4jContainer<?> container = new Neo4jContainer<>(type
            .getProperties().get("image").toString())
            .withoutAuthentication()
            .withCopyFileToContainer(MountableFile
                    .forClasspathResource(HOST_SCRIPT_PATH),
                    CONTAINER_SCRIPT_PATH);
    private JdbcDataProvider provider;
    private DataConnection connection;
    private DataFrameComparator dataFrameComparator;

    @BeforeAll
    public void init() {
        initScript();
        dataFrameComparator = new DataFrameComparator();
        SettingsManager settingsManager = SettingsManager.getInstance();
        settingsManager.initSettingsWithDefaults();
        ProviderManager providerManager = new ProviderManager();
        GrokConnect.providerManager = providerManager;
        provider = providerManager.getByName(type.getProperties().get("providerName").toString());
    }

    @BeforeEach
    public void beforeEach() {
        Credentials credentials = new Credentials();
        connection = new DataConnection();
        connection.credentials = credentials;
        connection.dataSource = provider.descriptor.type;
        connection.parameters.put(DbCredentials.SERVER, container.getHost());
        connection.parameters.put(DbCredentials.PORT, (double) container.getFirstMappedPort());
    }

    @DisplayName("Test whether container with db is running")
    @Order(1)
    @Test
    public void database_isRunning_ok() {
        Assertions.assertTrue(container.isRunning());
    }

    @DisplayName("Tests of testConnection(DataConnection conn)")
    @Test
    public void testConnection() {
        Assertions.assertDoesNotThrow(() -> provider.testConnection(connection));
    }

    @DisplayName("Parameters support")
    @ParameterizedTest(name = "{index} : {0}")
    @MethodSource({"grok_connect.providers.arguments_provider.Neo4jObjectsMother#checkParameterSupport_ok",
            "grok_connect.providers.arguments_provider.Neo4jObjectsMother#checkRegexSupport_ok",
            "grok_connect.providers.arguments_provider.Neo4jObjectsMother#checkMultipleParametersSupport_ok"})
    public void checkParameterSupport_ok(@ConvertWith(NamedArgumentConverter.class) FuncCall funcCall, DataFrame expected) {
        funcCall.func.connection = connection;
        DataFrame actual = Assertions.assertDoesNotThrow(() -> provider.execute(funcCall));
        Assertions.assertTrue(dataFrameComparator.isDataFramesEqual(expected, actual));
    }

    @DisplayName("Parameters support for datetime")
    @ParameterizedTest(name = "{index} : {0}")
    @MethodSource("grok_connect.providers.arguments_provider.Neo4jObjectsMother#checkDatesParameterSupport_ok")
    public void checkDatesParameterSupport_ok(@ConvertWith(NamedArgumentConverter.class) FuncCall funcCall, DataFrame expected) {
        funcCall.func.connection = connection;
        DataFrame actual = Assertions.assertDoesNotThrow(() -> provider.execute(funcCall));
        Assertions.assertTrue(dataFrameComparator.isDataFramesEqual(expected, actual));
    }

    @DisplayName("Support for all property types")
    @ParameterizedTest(name = "{index} : {0}")
    @MethodSource("grok_connect.providers.arguments_provider.Neo4jObjectsMother#checkAllTypesSupport_ok")
    public void checkAllTypesSupport_ok(@ConvertWith(NamedArgumentConverter.class) FuncCall funcCall, DataFrame expected) {
        funcCall.func.connection = connection;
        DataFrame actual = Assertions.assertDoesNotThrow(() -> provider.execute(funcCall));
        Assertions.assertTrue(dataFrameComparator.isDataFramesEqual(expected, actual));
    }

    @DisplayName("Support for returned map type")
    @ParameterizedTest(name = "{index} : {0}")
    @MethodSource("grok_connect.providers.arguments_provider.Neo4jObjectsMother#checkSupportOfMapReturnType_ok")
    public void checkSupportOfMapReturnType_ok(@ConvertWith(NamedArgumentConverter.class) FuncCall funcCall, DataFrame expected) {
        funcCall.func.connection = connection;
        DataFrame actual = Assertions.assertDoesNotThrow(() -> provider.execute(funcCall));
        Assertions.assertTrue(dataFrameComparator.isDataFramesEqualUnOrdered(expected, actual));
    }

    private void initScript() {
        try {
            container.execInContainer("cypher-shell", "-f", CONTAINER_SCRIPT_PATH);
        } catch (IOException | InterruptedException e) {
            throw new RuntimeException("Something went wrong when executing init script", e);
        }
    }
}
