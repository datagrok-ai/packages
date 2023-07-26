--name: PostgresqlTestCacheTableWide
--friendlyName: PostgresqlTestCacheTableWide
--connection: PostgreSQLDBTests
--meta.cache: true
SELECT * FROM Test_Wide;
--end

--name: PostgresqlTestCacheTableNormal
--friendlyName: PostgresqlTestCacheTableNormal
--connection: PostgreSQLDBTests
--meta.cache: true
SELECT * FROM Test_Normal;
--end

--name: PostgresqlScalarCacheTest
--friendlyName: PostgresqlScalarCacheTest
--connection: PostgreSQLDBTests
--output: double max_value
--output: int count
--output: string first_name
--output: datetime date
--meta.cache: true
--meta.batchMode: true
SELECT pg_sleep(3);
--batch
SELECT max(some_number) as max_value,
       (SELECT count(*) FROM MOCK_DATA) as count,
       (SELECT first_name FROM MOCK_DATA WHERE id = 10) as first_name,
        (SELECT date FROM MOCK_DATA WHERE id = 10) as date FROM MOCK_DATA;
--end

--name: PostgresqlCachedConnTest
--friendlyName: PostgresqlCachedConnTest
--connection: PostgreSQLDBTestsCached
SELECT *, pg_sleep(0.1) FROM MOCK_DATA;
--end

--name: PostgresqlCacheInvalidateQueryTest
--friendlyName: PostgresqlCacheInvalidateQueryTest
--connection: PostgreSQLDBTests
--meta.cache: true
--meta.cache.invalidateOn: 0 1 * * *
SELECT *, pg_sleep(0.1) FROM MOCK_DATA;
--end

--name: PostgresqlScalarCacheInvalidationTest
--friendlyName: PostgresqlScalarCacheInvalidationTest
--connection: PostgreSQLDBTests
--output: double max_value
--output: int count
--output: string first_name
--output: datetime date
--meta.cache: true
--meta.cache.invalidateOn: 0 1 * * *
--meta.batchMode: true
SELECT pg_sleep(3);
--batch
SELECT max(some_number) as max_value,
       (SELECT count(*) FROM MOCK_DATA) as count,
       (SELECT first_name FROM MOCK_DATA WHERE id = 10) as first_name,
        (SELECT date FROM MOCK_DATA WHERE id = 10) as date FROM MOCK_DATA;
--end

--name: PostgresqlGetNow
--friendlyName: PostgresqlGetNow
--connection: PostgreSQLDBTests
--output: datetime date
SELECT now() as date;
--end
