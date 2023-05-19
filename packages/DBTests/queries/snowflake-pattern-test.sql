--name: SnowflakePatternsAll
--connection: SnowflakeDBTests
--test: Dbtests:expectTable(SnowflakePatternsAll(), OpenFile('System:AppData/Dbtests/snowflake/data1-30.d42')) //skip: GROK-12289
SELECT * FROM test.mock_data;
--end

--name: SnowflakeIntTypePatternNone
--connection: SnowflakeDBTests
--input: int id = 20
--test: Dbtests:expectTable(SnowflakeIntTypePatternNone(), OpenFile('System:AppData/Dbtests/snowflake/data20.d42')) //skip: GROK-12289
SELECT * FROM test.mock_data WHERE id = @id;
--end

--name: SnowflakeStringTypeIntPatternOpMore
--connection: SnowflakeDBTests
--input: string id = ">28" {pattern: int}
--test: Dbtests:expectTable(SnowflakeStringTypeIntPatternOpMore(), OpenFile('System:AppData/Dbtests/snowflake/data29-30.d42')) //skip: GROK-12289
SELECT * FROM test.mock_data WHERE @id(id)
--end

--name: SnowflakeStringTypeIntPatternOpMoreEq
--connection: SnowflakeDBTests
--input: string id = ">=29" {pattern: int}
--test: Dbtests:expectTable(SnowflakeStringTypeIntPatternOpMoreEq(), OpenFile('System:AppData/Dbtests/snowflake/data29-30.d42')) //skip: GROK-12289
SELECT * FROM test.mock_data WHERE @id(id)
--end

--name: SnowflakeStringTypeIntPatternOpLessEq
--connection: SnowflakeDBTests
--input: string id = "<=1" {pattern: int}
--test: Dbtests:expectTable(SnowflakeStringTypeIntPatternOpLessEq(), OpenFile('System:AppData/Dbtests/snowflake/data1.d42')) //skip: GROK-12289
SELECT * FROM test.mock_data WHERE @id(id)
--end

--name: SnowflakeStringTypeIntPatternOpLess
--connection: SnowflakeDBTests
--input: string id = "<2" {pattern: int}
--test: Dbtests:expectTable(SnowflakeStringTypeIntPatternOpLess(), OpenFile('System:AppData/Dbtests/snowflake/data1.d42')) //skip: GROK-12289
SELECT * FROM test.mock_data WHERE @id(id)
--end

--name: SnowflakeStringTypeIntPatternOpIn
--connection: SnowflakeDBTests
--input: string id = "in(29, 30)" {pattern: int}
--test: Dbtests:expectTable(SnowflakeStringTypeIntPatternOpIn(), OpenFile('System:AppData/Dbtests/snowflake/data29-30.d42')) //skip: GROK-12289
SELECT * FROM test.mock_data WHERE @id(id)
--end

--name: SnowflakeStringTypeIntPatternOpNotIn
--connection: SnowflakeDBTests
--input: string id = "not in(21, 22, 23, 24, 25, 26, 27, 28, 29, 30)" {pattern: int}
--test: Dbtests:expectTable(SnowflakeStringTypeIntPatternOpNotIn(), OpenFile('System:AppData/Dbtests/snowflake/data1-20.d42')) //skip: GROK-12289
SELECT * FROM test.mock_data WHERE @id(id)
--end

--name: SnowflakeStringTypeIntPatternOpMinMax
--connection: SnowflakeDBTests
--input: string id = "min-max 29-30" {pattern: int}
--test: Dbtests:expectTable(SnowflakeStringTypeIntPatternOpMinMax(), OpenFile('System:AppData/Dbtests/snowflake/data29-30.d42')) //skip: GROK-12289
SELECT * FROM test.mock_data WHERE @id(id)
--end

--name: SnowflakeStringTypeIntPatternOpNotEq
--connection: SnowflakeDBTests
--input: string id = "!=1" {pattern: int}
--test: Dbtests:expectTable(SnowflakeStringTypeIntPatternOpNotEq(), OpenFile('System:AppData/Dbtests/snowflake/data2-30.d42')) //skip: GROK-12289
SELECT * FROM test.mock_data WHERE @id(id)
--end

--name: SnowflakeDoubleTypePatternNone
--connection: SnowflakeDBTests
--input: double some_number = 510.32
--test: Dbtests:expectTable(SnowflakeDoubleTypePatternNone(), OpenFile('System:AppData/Dbtests/snowflake/data1.d42')) //skip: GROK-12289
SELECT * FROM test.mock_data WHERE some_number = @some_number;
--end

--name: SnowflakeStringTypePatternDoubleOpMore
--connection: SnowflakeDBTests
--input: string some_number = ">975" {pattern: double}
--test: Dbtests:expectTable(SnowflakeStringTypePatternDoubleOpMore(), OpenFile('System:AppData/Dbtests/snowflake/data10,26.d42')) //skip: GROK-12289
SELECT * FROM test.mock_data WHERE @some_number(some_number);
--end

--name: SnowflakeStringTypePatternDoubleOpMoreEq
--connection: SnowflakeDBTests
--input: string some_number = ">=975" {pattern: double}
--test: Dbtests:expectTable(SnowflakeStringTypePatternDoubleOpMoreEq(), OpenFile('System:AppData/Dbtests/snowflake/data10,26.d42')) //skip: GROK-12289
SELECT * FROM test.mock_data WHERE @some_number(some_number);
--end

--name: SnowflakeStringTypePatternDoubleOpLess
--connection: SnowflakeDBTests
--input: string some_number = "<20" {pattern: double}
--test: Dbtests:expectTable(SnowflakeStringTypePatternDoubleOpLess(), OpenFile('System:AppData/Dbtests/snowflake/data5.d42')) //skip: GROK-12289
SELECT * FROM test.mock_data WHERE @some_number(some_number);
--end

--name: SnowflakeStringTypePatternDoubleOpLessEq
--connection: SnowflakeDBTests
--input: string some_number = "<=20" {pattern: double}
--test: Dbtests:expectTable(SnowflakeStringTypePatternDoubleOpLessEq(), OpenFile('System:AppData/Dbtests/snowflake/data5.d42')) //skip: GROK-12289
SELECT * FROM test.mock_data WHERE @some_number(some_number);
--end

--name: SnowflakeStringTypePatternStringOpContains
--connection: SnowflakeDBTests
--input: string first_name = "contains Z" {pattern: string}
--test: Dbtests:expectTable(SnowflakeStringTypePatternStringOpContains(), OpenFile('System:AppData/Dbtests/snowflake/data25.d42')) //skip: GROK-12289
SELECT * FROM test.mock_data WHERE @first_name(first_name);
--end

--name: SnowflakeStringTypePatternStringOpStartsWith
--connection: SnowflakeDBTests
--input: string first_name = "starts with W" {pattern: string}
--test: Dbtests:expectTable(SnowflakeStringTypePatternStringOpStartsWith(), OpenFile('System:AppData/Dbtests/snowflake/data23.d42')) //skip: GROK-12289
SELECT * FROM test.mock_data WHERE @first_name(first_name);
--end

--name: SnowflakeStringTypePatternStringOpEndsWith
--connection: SnowflakeDBTests
--input: string first_name = "ends with y" {pattern: string}
--test: Dbtests:expectTable(SnowflakeStringTypePatternStringOpEndsWith(), OpenFile('System:AppData/Dbtests/snowflake/data6,23,25.d42')) //skip: GROK-12289
SELECT * FROM test.mock_data WHERE @first_name(first_name);
--end

--name: SnowflakeStringTypePatternStringOpIn
--connection: SnowflakeDBTests
--input: string country = "in (Poland, Brazil)" {pattern: string}
--test: Dbtests:expectTable(SnowflakeStringTypePatternStringOpIn(), OpenFile('System:AppData/Dbtests/snowflake/data2,5,20.d42')) //skip: GROK-12289
SELECT * FROM test.mock_data WHERE @country(country);
--end

--name: SnowflakeStringTypePatternStringOpRegex
--connection: SnowflakeDBTests
--input: string email = "regex ^([A-Za-z0-9_]+@google.com.au)$" {pattern: string}
--test: Dbtests:expectTable(SnowflakeStringTypePatternStringOpRegex(), OpenFile('System:AppData/Dbtests/snowflake/data9.d42')) //skip: GROK-12289
SELECT * FROM test.mock_data WHERE @email(email);
--end

--name: SnowflakePatternsAllParams
--connection: SnowflakeDBTests
--input: string first_name = "starts with p" {pattern: string}
--input: string id = ">1" {pattern :int}
--input: bool bool = false
--input: string email = "contains com" {pattern: string}
--input: string some_number = ">20" {pattern: double}
--input: string country = "in (Indonesia)" {pattern: string}
--input: string date = "before 1/1/2022" {pattern: datetime}
--test: Dbtests:expectTable(SnowflakePatternsAllParams(), OpenFile("System:AppData/Dbtests/snowflake/data13.d42")) //skip: GROK-12289
SELECT * FROM test.mock_data
WHERE @first_name(first_name)
  AND @id(id)
           AND bool = @bool
           AND @email(email)
           AND @some_number(some_number)
           AND @country(country)
           AND @date(date);
--end
