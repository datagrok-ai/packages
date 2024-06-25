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
import serialization.DataFrame;

@TestInstance(TestInstance.Lifecycle.PER_CLASS)
class SnowflakeDataProviderTest {
    private static final Provider type = Provider.SNOWFLAKE;
    private JdbcDataProvider provider;
    private DataConnection connection;
    private DataFrameComparator dataFrameComparator;

    @BeforeAll
    public void init() {
        dataFrameComparator = new DataFrameComparator();
        SettingsManager settingsManager = SettingsManager.getInstance();
        settingsManager.initSettingsWithDefaults();
        ProviderManager providerManager = new ProviderManager();
        provider = providerManager.getByName(type.getProperties().get("providerName").toString());
    }

    @BeforeEach
    public void beforeEach() {
        Credentials credentials = new Credentials();
        credentials.parameters.put(DbCredentials.LOGIN, type.getProperties().get("user"));
        credentials.parameters.put(DbCredentials.PASSWORD, type.getProperties().get("password"));
        connection = new DataConnection();
        connection.credentials = credentials;
        connection.dataSource = provider.descriptor.type;
        connection.parameters.put(DbCredentials.ACCOUNT_LOCATOR, type.getProperties().get("accountLocator"));
        connection.parameters.put(DbCredentials.REGION_ID, type.getProperties().get("region"));
        connection.parameters.put(DbCredentials.DB, type.getProperties().get("database"));
        connection.parameters.put(DbCredentials.CLOUD, type.getProperties().get("cloud"));
        connection.parameters.put(DbCredentials.WAREHOUSE, type.getProperties().get("warehouse"));
    }

    @DisplayName("Tests of testConnection(DataConnection conn)")
    @Test
    public void testConnection() {
        Assertions.assertDoesNotThrow(() -> provider.testConnection(connection));
    }

    @DisplayName("Test of testConnection(DataConnection conn) when no credentials provided")
    @Test
    public void testConnection_notOk() {
        connection.credentials = null;
        Assertions.assertThrows(GrokConnectException.class, () -> provider.testConnection(connection));
    }

    @DisplayName("Test of getSchemas() method with correct DataConnection")
    @ParameterizedTest(name = "CORRECT ARGUMENTS")
    @MethodSource("grok_connect.providers.arguments_provider.SnowflakeObjectsMother#getSchemas_ok")
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
    @MethodSource("grok_connect.providers.arguments_provider.SnowflakeObjectsMother#getSchema_ok")
    public void getSchema_ok(DataFrame expected) {
        DataFrame actual = Assertions.assertDoesNotThrow(() -> provider.getSchema(connection,
                "PUBLIC", "MOCK_DATA"));
        Assertions.assertTrue(dataFrameComparator.isDataFramesEqual(expected, actual));
    }

    @Disabled
    @Test
    public void getSchema_notOk() {
        // method probably should throw something when bad input
    }

    @DisplayName("Parameters support")
    @ParameterizedTest(name = "{index} : {0}")
    @MethodSource({"grok_connect.providers.arguments_provider.CommonObjectsMother#checkParameterSupport_ok",
            "grok_connect.providers.arguments_provider.CommonObjectsMother#checkMultipleParametersSupport_ok",
            "grok_connect.providers.arguments_provider.CommonObjectsMother#checkListParameterSupport_ok",
            "grok_connect.providers.arguments_provider.CommonObjectsMother#checkRegexSupport_ok"})
    public void checkParameterSupport_ok(@ConvertWith(NamedArgumentConverter.class) FuncCall funcCall, DataFrame expected) {
        prepareDataFrame(expected);
        funcCall.func.connection = connection;
        DataFrame actual = Assertions.assertDoesNotThrow(() -> provider.execute(funcCall));
        Assertions.assertTrue(dataFrameComparator.isDataFramesEqual(expected, actual));
    }

    @Disabled("Until task will be fixed")
    @DisplayName("Parameters support for datetime")
    @ParameterizedTest(name = "{index} : {0}")
    @MethodSource("grok_connect.providers.arguments_provider.CommonObjectsMother#checkDatesParameterSupport_ok")
    public void checkDatesParameterSupport_ok(@ConvertWith(NamedArgumentConverter.class) FuncCall funcCall, DataFrame expected) {
        prepareDataFrame(expected);
        funcCall.func.connection = connection;
        DataFrame actual = Assertions.assertDoesNotThrow(() -> provider.execute(funcCall));
        Assertions.assertTrue(dataFrameComparator.isDataFramesEqual(expected, actual));
    }

    @DisplayName("Output support for snowflake date, time, timestamp types")
    @ParameterizedTest(name = "{index} : {0}")
    @MethodSource("grok_connect.providers.arguments_provider.SnowflakeObjectsMother#checkOutputDataFrame_dateTypes_ok")
    public void checkOutputDataFrame_dateTypes_ok(@ConvertWith(NamedArgumentConverter.class) FuncCall funcCall, DataFrame expected) {
        funcCall.func.connection = connection;
        DataFrame actual = Assertions.assertDoesNotThrow(() -> provider.execute(funcCall));
        Assertions.assertTrue(dataFrameComparator.isDataFramesEqual(expected, actual));
    }

    @DisplayName("Output support for snowflake numeric types")
    @ParameterizedTest(name = "{index} : {0}")
    @MethodSource("grok_connect.providers.arguments_provider.SnowflakeObjectsMother#checkOutputDataFrame_numericTypes_ok")
    public void checkOutputDataFrame_numericTypes_ok(@ConvertWith(NamedArgumentConverter.class) FuncCall funcCall, DataFrame expected) {
        funcCall.func.connection = connection;
        DataFrame actual = Assertions.assertDoesNotThrow(() -> provider.execute(funcCall));
        Assertions.assertTrue(dataFrameComparator.isDataFramesEqual(expected, actual));
    }

    @DisplayName("Output support for snowflake binary type")
    @ParameterizedTest(name = "{index} : {0}")
    @MethodSource("grok_connect.providers.arguments_provider.SnowflakeObjectsMother#checkOutputDataFrame_binaryType_ok")
    public void checkOutputDataFrame_binaryType_ok(@ConvertWith(NamedArgumentConverter.class) FuncCall funcCall, DataFrame expected) {
        funcCall.func.connection = connection;
        DataFrame actual = Assertions.assertDoesNotThrow(() -> provider.execute(funcCall));
        Assertions.assertTrue(dataFrameComparator.isDataFramesEqual(expected, actual));
    }

    @DisplayName("Output support for snowflake geo type")
    @ParameterizedTest(name = "{index} : {0}")
    @MethodSource("grok_connect.providers.arguments_provider.SnowflakeObjectsMother#checkOutputDataFrame_geoType_ok")
    public void checkOutputDataFrame_geoType_ok(@ConvertWith(NamedArgumentConverter.class) FuncCall funcCall, DataFrame expected) {
        funcCall.func.connection = connection;
        DataFrame actual = Assertions.assertDoesNotThrow(() -> provider.execute(funcCall));
        Assertions.assertTrue(dataFrameComparator.isDataFramesEqual(expected, actual));
    }

    @DisplayName("Output support for snowflake semi-structured types")
    @ParameterizedTest(name = "{index} : {0}")
    @MethodSource("grok_connect.providers.arguments_provider.SnowflakeObjectsMother#checkOutputDataFrame_semiStructuredTypes_ok")
    public void checkOutputDataFrame_semiStructuredTypes_ok(@ConvertWith(NamedArgumentConverter.class) FuncCall funcCall, DataFrame expected) {
        funcCall.func.connection = connection;
        DataFrame actual = Assertions.assertDoesNotThrow(() -> provider.execute(funcCall));
        Assertions.assertTrue(dataFrameComparator.isDataFramesEqual(expected, actual));
    }

    @DisplayName("Snowflake Null safety")
    @ParameterizedTest(name = "{index} : {0}")
    @MethodSource("grok_connect.providers.arguments_provider.CommonObjectsMother#checkNullSupport_ok")
    public void checkNullSupport_ok(@ConvertWith(NamedArgumentConverter.class) FuncCall funcCall) {
        funcCall.func.connection = connection;
        Assertions.assertDoesNotThrow(() -> provider.execute(funcCall));
    }

    private void prepareDataFrame(DataFrame dataFrame) {
        dataFrame.columns.forEach(column -> column.name = column.name.toUpperCase());
    }
}
