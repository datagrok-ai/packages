package grok_connect.providers;

import grok_connect.connectors_info.*;
import grok_connect.providers.utils.DataFrameComparator;
import grok_connect.providers.utils.NamedArgumentConverter;
import grok_connect.providers.utils.Provider;
import grok_connect.utils.ProviderManager;
import grok_connect.utils.SettingsManager;
import org.junit.jupiter.api.*;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.converter.ConvertWith;
import org.junit.jupiter.params.provider.MethodSource;
import org.mockito.Mockito;
import serialization.DataFrame;

@Disabled("Until test instance of PI will be available")
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
class PIDataProviderTest {
    private static final Provider type = Provider.PI;
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
        credentials.parameters.put(DbCredentials.PASSWORD, type.getProperties().get("password"));
        credentials.parameters.put(DbCredentials.LOGIN, type.getProperties().get("user"));
        connection = new DataConnection();
        connection.credentials = credentials;
        connection.dataSource = provider.descriptor.type;
        connection.parameters.put(DbCredentials.SERVER, type.getProperties().get(DbCredentials.SERVER));
        connection.parameters.put(DbCredentials.ACCESS_SERVER, type.getProperties().get(DbCredentials.ACCESS_SERVER));
        connection.parameters.put(DbCredentials.INITIAL_CATALOG, type.getProperties().get(DbCredentials.INITIAL_CATALOG));
    }

    @DisplayName("Tests of testConnection(DataConnection conn)")
    @Test
    public void testConnection() {
        Assertions.assertDoesNotThrow(() -> provider.testConnection(connection));
    }

    @DisplayName("test queries")
    @ParameterizedTest(name = "{index} : {0}")
    @MethodSource("grok_connect.providers.arguments_provider.PiObjectsMother#testQueries")
    public void testQueries(@ConvertWith(NamedArgumentConverter.class) FuncCall funcCall, DataFrame expected) {
        funcCall.func.connection = connection;
        DataFrame actual = Assertions.assertDoesNotThrow(() -> provider.execute(funcCall));
        Assertions.assertTrue(dataFrameComparator.isDataFramesEqual(expected, actual));
    }
}
