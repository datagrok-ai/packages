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

@Disabled("Until test instance of Athena will be available")
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
class AthenaDataProviderTest {
    private static final Provider type = Provider.ATHENA;
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
        credentials.parameters.put(DbCredentials.ACCESS_KEY, type.getProperties().get("accessKey"));
        credentials.parameters.put(DbCredentials.SECRET_KEY, type.getProperties().get("secretKey"));
        connection = new DataConnection();
        connection.credentials = credentials;
        connection.dataSource = provider.descriptor.type;
        connection.parameters.put(DbCredentials.REGION_ID, type.getProperties().get("region"));
        connection.parameters.put(DbCredentials.DB, type.getProperties().get("database"));
        connection.parameters.put(DbCredentials.S3OutputLocation, type.getProperties().get("S3OutputLocation"));
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
    @MethodSource("grok_connect.providers.arguments_provider.AthenaObjectsMother#getSchemas_ok")
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
    @MethodSource("grok_connect.providers.arguments_provider.AthenaObjectsMother#getSchema_ok")
    public void getSchema_ok(DataFrame expected) {
        DataFrame actual = Assertions.assertDoesNotThrow(() -> provider.getSchema(connection,
                "test_db", "mock_data"));
        Assertions.assertTrue(dataFrameComparator.isDataFramesEqual(expected, actual));
    }

    @DisplayName("Parameters support")
    @ParameterizedTest(name = "{index} : {0}")
    @MethodSource({"grok_connect.providers.arguments_provider.AthenaObjectsMother#checkParameterSupport_ok",
            "grok_connect.providers.arguments_provider.AthenaObjectsMother#checkRegexSupport_ok",
            "grok_connect.providers.arguments_provider.AthenaObjectsMother#checkMultipleParametersSupport_ok",
            "grok_connect.providers.arguments_provider.AthenaObjectsMother#checkListParameterSupport_ok"})
    public void checkParameterSupport_ok(@ConvertWith(NamedArgumentConverter.class) FuncCall funcCall, DataFrame expected) {
        funcCall.func.connection = connection;
        DataFrame actual = Assertions.assertDoesNotThrow(() -> provider.execute(funcCall));
        Assertions.assertTrue(dataFrameComparator.isDataFramesEqual(expected, actual));
    }

    @DisplayName("Parameters support for datetime")
    @ParameterizedTest(name = "{index} : {0}")
    @MethodSource("grok_connect.providers.arguments_provider.AthenaObjectsMother#checkDatesParameterSupport_ok")
    public void checkDatesParameterSupport_ok(@ConvertWith(NamedArgumentConverter.class) FuncCall funcCall, DataFrame expected) {
        funcCall.func.connection = connection;
        DataFrame actual = Assertions.assertDoesNotThrow(() -> provider.execute(funcCall));
        Assertions.assertTrue(dataFrameComparator.isDataFramesEqual(expected, actual));
    }

    @DisplayName("Output support for athena array type")
    @ParameterizedTest(name = "{index} : {0}")
    @MethodSource("grok_connect.providers.arguments_provider.AthenaObjectsMother#checkOutputDataFrame_arrayType_ok")
    public void checkOutputDataFrame_arrayType_ok(@ConvertWith(NamedArgumentConverter.class) FuncCall funcCall, DataFrame expected) {
        funcCall.func.connection = connection;
        DataFrame actual = Assertions.assertDoesNotThrow(() -> provider.execute(funcCall));
        Assertions.assertTrue(dataFrameComparator.isDataFramesEqual(expected, actual));
    }

    @DisplayName("Output support for athena character types")
    @ParameterizedTest(name = "{index} : {0}")
    @MethodSource("grok_connect.providers.arguments_provider.AthenaObjectsMother#checkOutputDataFrame_characterTypes_ok")
    public void checkOutputDataFrame_characterTypes_ok(@ConvertWith(NamedArgumentConverter.class) FuncCall funcCall, DataFrame expected) {
        funcCall.func.connection = connection;
        DataFrame actual = Assertions.assertDoesNotThrow(() -> provider.execute(funcCall));
        Assertions.assertTrue(dataFrameComparator.isDataFramesEqual(expected, actual));
    }

    @DisplayName("Output support for athena date types")
    @ParameterizedTest(name = "{index} : {0}")
    @MethodSource("grok_connect.providers.arguments_provider.AthenaObjectsMother#checkOutputDataFrame_dateTypes_ok")
    public void checkOutputDataFrame_dateTypes_ok(@ConvertWith(NamedArgumentConverter.class)FuncCall funcCall, DataFrame expected) {
        funcCall.func.connection = connection;
        DataFrame actual = Assertions.assertDoesNotThrow(() -> provider.execute(funcCall));
        Assertions.assertTrue(dataFrameComparator.isDataFramesEqual(expected, actual));
    }

    @DisplayName("Output support for athena float types")
    @ParameterizedTest(name = "{index} : {0}")
    @MethodSource("grok_connect.providers.arguments_provider.AthenaObjectsMother#checkOutputDataFrame_floatTypes_ok")
    public void checkOutputDataFrame_floatTypes_ok(@ConvertWith(NamedArgumentConverter.class)FuncCall funcCall, DataFrame expected) {
        funcCall.func.connection = connection;
        DataFrame actual = Assertions.assertDoesNotThrow(() -> provider.execute(funcCall));
        Assertions.assertTrue(dataFrameComparator.isDataFramesEqual(expected, actual));
    }

    @DisplayName("Output support for athena map type")
    @ParameterizedTest(name = "{index} : {0}")
    @MethodSource("grok_connect.providers.arguments_provider.AthenaObjectsMother#checkOutputDataFrame_mapType_ok")
    public void checkOutputDataFrame_mapType_ok(@ConvertWith(NamedArgumentConverter.class)FuncCall funcCall, DataFrame expected) {
        funcCall.func.connection = connection;
        DataFrame actual = Assertions.assertDoesNotThrow(() -> provider.execute(funcCall));
        Assertions.assertTrue(dataFrameComparator.isDataFramesEqual(expected, actual));
    }

    @DisplayName("Output support for athena numeric types")
    @ParameterizedTest(name = "{index} : {0}")
    @MethodSource("grok_connect.providers.arguments_provider.AthenaObjectsMother#checkOutputDataFrame_numericTypes_ok")
    public void checkOutputDataFrame_numericTypes_ok(@ConvertWith(NamedArgumentConverter.class)FuncCall funcCall, DataFrame expected) {
        funcCall.func.connection = connection;
        DataFrame actual = Assertions.assertDoesNotThrow(() -> provider.execute(funcCall));
        Assertions.assertTrue(dataFrameComparator.isDataFramesEqual(expected, actual));
    }

    @DisplayName("Output support for athena struct type")
    @ParameterizedTest(name = "{index} : {0}")
    @MethodSource("grok_connect.providers.arguments_provider.AthenaObjectsMother#checkOutputDataFrame_structType_ok")
    public void checkOutputDataFrame_structType_ok(@ConvertWith(NamedArgumentConverter.class)FuncCall funcCall, DataFrame expected) {
        funcCall.func.connection = connection;
        DataFrame actual = Assertions.assertDoesNotThrow(() -> provider.execute(funcCall));
        Assertions.assertTrue(dataFrameComparator.isDataFramesEqual(expected, actual));
    }
}
