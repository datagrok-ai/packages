package grok_connect.providers;

import com.mongodb.MongoClient;
import com.mongodb.client.MongoCollection;
import com.mongodb.client.MongoDatabase;
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
import org.bson.Document;
import org.junit.jupiter.api.*;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.converter.ConvertWith;
import org.junit.jupiter.params.provider.MethodSource;
import org.testcontainers.containers.MongoDBContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.utility.DockerImageName;
import org.testcontainers.utility.MountableFile;
import serialization.DataFrame;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.List;

@TestInstance(TestInstance.Lifecycle.PER_CLASS)
@Testcontainers
class MongoDbDataProviderTest {
    private static final Provider type = Provider.MONGO_DB;
    private static final String DEFAULT_DATABASE_NAME = "test";
    private static final String COLLECTION_1 = "mocks";
    private static final String COLLECTION_2 = "one_line";

    @Container
    private static final MongoDBContainer container =
            new MongoDBContainer(DockerImageName.parse(type.getProperties().get("image").toString()))
            .withCopyToContainer(MountableFile.forClasspathResource("scripts/mongodb/one_line.json"),
                    "/etc/one_line.json")
            .withCopyToContainer(MountableFile.forClasspathResource("scripts/mongodb/mocks.json"),
                    "/etc/mocks.json");
    private JdbcDataProvider provider;
    private DataConnection connection;
    private DataFrameComparator dataFrameComparator;

    @BeforeAll
    public void init() {
        dataFrameComparator = new DataFrameComparator();
        SettingsManager settingsManager = SettingsManager.getInstance();
        settingsManager.initSettingsWithDefaults();
        ProviderManager providerManager = new ProviderManager();
        GrokConnect.providerManager = providerManager;
        provider = providerManager.getByName(type.getProperties().get("providerName").toString());
        initDatabase("src/test/resources/scripts/mongodb/mocks.json", COLLECTION_1);
        initDatabase("src/test/resources/scripts/mongodb/one_line.json", COLLECTION_2);
    }

    @BeforeEach
    public void beforeEach() {
        Credentials credentials = new Credentials();
        credentials.parameters.put(DbCredentials.LOGIN, null);
        credentials.parameters.put(DbCredentials.PASSWORD, null);
        connection = new DataConnection();
        connection.credentials = credentials;
        connection.dataSource = provider.descriptor.type;
        connection.parameters.put(DbCredentials.SERVER, container.getHost());
        connection.parameters.put(DbCredentials.PORT, Double.valueOf(container.getFirstMappedPort().toString()));
        connection.parameters.put(DbCredentials.DB, DEFAULT_DATABASE_NAME);
    }

    @DisplayName("Tests of testConnection(DataConnection conn)")
    @Test
    public void testConnection() {
        Assertions.assertDoesNotThrow(() -> provider.testConnection(connection));
    }

    @DisplayName("Mongo all types")
    @ParameterizedTest(name = "{index} : {0}")
    @MethodSource("grok_connect.providers.arguments_provider.MongoDbObjectsMother#checkOutputAllTypes_ok")
    public void checkOutputAllTypes_ok(@ConvertWith(NamedArgumentConverter.class) FuncCall funcCall, DataFrame expected) {
        funcCall.func.connection = connection;
        DataFrame actual = Assertions.assertDoesNotThrow(() -> provider.execute(funcCall));
        Assertions.assertTrue(dataFrameComparator.isDataFramesEqual(expected, actual));
    }

    @DisplayName("Mongo string return")
    @ParameterizedTest(name = "{index} : {0}")
    @MethodSource("grok_connect.providers.arguments_provider.MongoDbObjectsMother#checkStringReturn_ok")
    public void checkStringReturn_ok(@ConvertWith(NamedArgumentConverter.class) FuncCall funcCall, DataFrame expected) {
        funcCall.func.connection = connection;
        DataFrame actual = Assertions.assertDoesNotThrow(() -> provider.execute(funcCall));
        Assertions.assertTrue(dataFrameComparator.isDataFramesEqual(expected, actual));
    }

    @DisplayName("Mongo one document return")
    @ParameterizedTest(name = "{index} : {0}")
    @MethodSource("grok_connect.providers.arguments_provider.MongoDbObjectsMother#checkOneDocument_ok")
    public void checkOneDocument_ok(@ConvertWith(NamedArgumentConverter.class) FuncCall funcCall, DataFrame expected) {
        funcCall.func.connection = connection;
        DataFrame actual = Assertions.assertDoesNotThrow(() -> provider.execute(funcCall));
        Assertions.assertTrue(dataFrameComparator.isDataFramesEqual(expected, actual));
    }

    @DisplayName("Mongo null return")
    @ParameterizedTest(name = "{index} : {0}")
    @MethodSource("grok_connect.providers.arguments_provider.MongoDbObjectsMother#checkNullResult_ok")
    public void checkNullResult_ok(@ConvertWith(NamedArgumentConverter.class) FuncCall funcCall, DataFrame expected) {
        funcCall.func.connection = connection;
        DataFrame actual = Assertions.assertDoesNotThrow(() -> provider.execute(funcCall));
        Assertions.assertTrue(dataFrameComparator.isDataFramesEqual(expected, actual));
    }

    private void initDatabase(String jsonPath, String collectionName) {
        try (MongoClient client = new MongoClient(container.getHost(), container.getFirstMappedPort())) {
            MongoDatabase test = client.getDatabase(DEFAULT_DATABASE_NAME);
            test.createCollection(collectionName);
            MongoCollection<Document> collection= test.getCollection(collectionName);
            try {
                List<String> jsonList = Files.readAllLines(Paths.get(jsonPath));
                List<String> filteredJsonList = new ArrayList<>();
                StringBuilder currentDocument = new StringBuilder();
                for(int i = 1; i < jsonList.size() - 1; i++) {
                    String str = jsonList.get(i);
                    if (str.isEmpty()) {
                        filteredJsonList.add(currentDocument.toString());
                        currentDocument = new StringBuilder();
                    }else {
                        currentDocument.append(str);
                    }
                }
                for (String str: filteredJsonList) {
                    collection.insertOne(Document.parse(str));
                }
            } catch (IOException e) {
                throw new RuntimeException(e);
            }
        }
    }
}
