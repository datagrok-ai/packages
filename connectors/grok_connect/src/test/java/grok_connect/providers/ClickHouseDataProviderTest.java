package grok_connect.providers;

import grok_connect.connectors_info.Credentials;
import grok_connect.connectors_info.DataConnection;
import grok_connect.connectors_info.DbCredentials;
import grok_connect.connectors_info.FuncCall;
import grok_connect.providers.utils.NamedArgumentConverter;
import grok_connect.providers.utils.Provider;
import grok_connect.utils.GrokConnectException;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Disabled;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Order;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.converter.ConvertWith;
import org.junit.jupiter.params.provider.MethodSource;
import serialization.DataFrame;

class ClickHouseDataProviderTest extends ContainerizedProviderBaseTest {
    protected ClickHouseDataProviderTest(Provider type) {
        super(type);
    }

    @Override
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
        String[] splitUrl = container.getJdbcUrl().split("/");
        connection.parameters.put(DbCredentials.DB, splitUrl[splitUrl.length - 1]);
    }

    @Override
    @DisplayName("Test of testConnection(DataConnection conn) when no credentials provided")
    @Order(3)
    @Test
    public void testConnection_notOk() {
        connection.parameters.put(DbCredentials.PORT, (double) 1);
        Assertions.assertThrows(GrokConnectException.class, () -> provider.testConnection(connection));
    }

    @DisplayName("Test of getSchemas() method with correct DataConnection")
    @ParameterizedTest(name = "CORRECT ARGUMENTS")
    @MethodSource("grok_connect.providers.arguments_provider.ClickHouseObjectsMother#getSchemas_ok")
    public void getSchemas_ok(DataFrame expected) {
        DataFrame actual = Assertions.assertDoesNotThrow(() -> provider.getSchemas(connection));
        Assertions.assertTrue(dataFrameComparator.isDataFramesEqualUnOrdered(expected, actual));
    }

    @Disabled
    @Test
    public void getSchemas_notOk() {
        // method probably should throw something when bad input
    }

    @DisplayName("Test of getSchema() method with correct DataConnection")
    @ParameterizedTest(name = "CORRECT ARGUMENTS")
    @MethodSource("grok_connect.providers.arguments_provider.ClickHouseObjectsMother#getSchema_ok")
    public void getSchema_ok(DataFrame expected) {
        DataFrame actual = Assertions.assertDoesNotThrow(() -> provider.getSchema(connection,
                "default", "mock_data"));
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
            "grok_connect.providers.arguments_provider.ClickHouseObjectsMother#checkListParameterSupport_ok",
            "grok_connect.providers.arguments_provider.CommonObjectsMother#checkRegexSupport_ok"})
    public void checkParameterSupport_ok(@ConvertWith(NamedArgumentConverter.class) FuncCall funcCall, DataFrame expected) {
        funcCall.func.connection = connection;
        DataFrame actual = Assertions.assertDoesNotThrow(() -> provider.execute(funcCall));
        Assertions.assertTrue(dataFrameComparator.isDataFramesEqualUnOrdered(expected, actual));
    }

    @DisplayName("Parameters support for datetime")
    @ParameterizedTest(name = "{index} : {0}")
    @MethodSource("grok_connect.providers.arguments_provider.CommonObjectsMother#checkDatesParameterSupport_ok")
    public void checkDatesParameterSupport_ok(@ConvertWith(NamedArgumentConverter.class) FuncCall funcCall, DataFrame expected) {
        funcCall.func.connection = connection;
        DataFrame actual = Assertions.assertDoesNotThrow(() -> provider.execute(funcCall));
        Assertions.assertTrue(dataFrameComparator.isDataFramesEqual(expected, actual));
    }

    @DisplayName("Output support for uuid type")
    @ParameterizedTest(name = "{index} : {0}")
    @MethodSource("grok_connect.providers.arguments_provider.ClickHouseObjectsMother#checkOutputDataFrame_uuidType_ok")
    public void checkOutputDataFrame_uuidType_ok(@ConvertWith(NamedArgumentConverter.class) FuncCall funcCall, DataFrame expected) {
        funcCall.func.connection = connection;
        DataFrame actual = Assertions.assertDoesNotThrow(() -> provider.execute(funcCall));
        Assertions.assertTrue(dataFrameComparator.isDataFramesEqual(expected, actual));
    }

    @DisplayName("Output support for numeric types")
    @ParameterizedTest(name = "{index} : {0}")
    @MethodSource("grok_connect.providers.arguments_provider.ClickHouseObjectsMother#checkOutputDataFrame_numericType_ok")
    public void checkOutputDataFrame_numericType_ok(@ConvertWith(NamedArgumentConverter.class)
                                                        FuncCall funcCall, DataFrame expected) {
        funcCall.func.connection = connection;
        DataFrame actual = Assertions.assertDoesNotThrow(() -> provider.execute(funcCall));
        Assertions.assertTrue(dataFrameComparator.isDataFramesEqual(expected, actual));
    }

    @DisplayName("Output support for array type")
    @ParameterizedTest(name = "{index} : {0}")
    @MethodSource("grok_connect.providers.arguments_provider.ClickHouseObjectsMother#checkOutputDataFrame_arrayType_ok")
    public void checkOutputDataFrame_arrayType_ok(@ConvertWith(NamedArgumentConverter.class)
                                                    FuncCall funcCall, DataFrame expected) {
        funcCall.func.connection = connection;
        DataFrame actual = Assertions.assertDoesNotThrow(() -> provider.execute(funcCall));
        Assertions.assertTrue(dataFrameComparator.isDataFramesEqual(expected, actual));
    }

    @DisplayName("Output support for tuple type")
    @ParameterizedTest(name = "{index} : {0}")
    @MethodSource("grok_connect.providers.arguments_provider.ClickHouseObjectsMother#checkOutputDataFrame_tupleType_ok")
    public void checkOutputDataFrame_tupleType_ok(@ConvertWith(NamedArgumentConverter.class)
                                                  FuncCall funcCall, DataFrame expected) {
        funcCall.func.connection = connection;
        DataFrame actual = Assertions.assertDoesNotThrow(() -> provider.execute(funcCall));
        Assertions.assertTrue(dataFrameComparator.isDataFramesEqual(expected, actual));
    }

    @DisplayName("Output support for map type")
    @ParameterizedTest(name = "{index} : {0}")
    @MethodSource("grok_connect.providers.arguments_provider.ClickHouseObjectsMother#checkOutputDataFrame_mapType_ok")
    public void checkOutputDataFrame_mapType_ok(@ConvertWith(NamedArgumentConverter.class)
                                                  FuncCall funcCall, DataFrame expected) {
        funcCall.func.connection = connection;
        DataFrame actual = Assertions.assertDoesNotThrow(() -> provider.execute(funcCall));
        Assertions.assertTrue(dataFrameComparator.isDataFramesEqual(expected, actual));
    }

    @DisplayName("Output support for date types")
    @ParameterizedTest(name = "{index} : {0}")
    @MethodSource("grok_connect.providers.arguments_provider.ClickHouseObjectsMother#checkOutputDataFrame_dateTypes_ok")
    public void checkOutputDataFrame_dateTypes_ok(@ConvertWith(NamedArgumentConverter.class)
                                                FuncCall funcCall, DataFrame expected) {
        funcCall.func.connection = connection;
        DataFrame actual = Assertions.assertDoesNotThrow(() -> provider.execute(funcCall));
        Assertions.assertTrue(dataFrameComparator.isDataFramesEqual(expected, actual));
    }

    @DisplayName("Output support for nested type")
    @ParameterizedTest(name = "{index} : {0}")
    @MethodSource("grok_connect.providers.arguments_provider.ClickHouseObjectsMother#checkOutputDataFrame_nestedType_ok")
    public void checkOutputDataFrame_nestedType_ok(@ConvertWith(NamedArgumentConverter.class)
                                                  FuncCall funcCall, DataFrame expected) {
        funcCall.func.connection = connection;
        DataFrame actual = Assertions.assertDoesNotThrow(() -> provider.execute(funcCall));
        Assertions.assertTrue(dataFrameComparator.isDataFramesEqual(expected, actual));
    }

    @DisplayName("Output support for geo types")
    @ParameterizedTest(name = "{index} : {0}")
    @MethodSource("grok_connect.providers.arguments_provider.ClickHouseObjectsMother#checkOutputDataFrame_geoTypes_ok")
    public void checkOutputDataFrame_geoTypes_ok(@ConvertWith(NamedArgumentConverter.class)
                                                   FuncCall funcCall, DataFrame expected) {
        funcCall.func.connection = connection;
        DataFrame actual = Assertions.assertDoesNotThrow(() -> provider.execute(funcCall));
        Assertions.assertTrue(dataFrameComparator.isDataFramesEqual(expected, actual));
    }
}
