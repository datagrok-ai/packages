# Grok Connect changelog

# 2.3.29 (2025-02-17) WIP

* Postgres: Set uuid as object

# 2.3.28 (2025-02-12)

* TableQuery: Order by support and having with aggregations
* Bugs fixes and improvements

## Requires

* Datagrok >= 1.24.0

# 2.2.25 (2024-12-02)

* TableQuery: Join supports

# 2.1.20 (2024-09-17)

* Foreign keys retrieval support
* Denodo provider fixes and schema browsing support
* Dependencies bump

# 2.1.19 (2024-08-01)

* Bug fixes in parameters parsing
* Bug fixes in TableQuery
* Disables redundant logging

# 2.1.18 (2024-07-17)

* Bug fixes

# 2.1.17 (2024-04-19)

* Bug fixes

# 2.1.16 (2024-03-20)

* Fix bug with missing last rows of returned DataFrame

# 2.1.15 (2024-03-19)

* Batch mode: use `--batch` for backward compatibility

## 2.1.14 (2024-02-21)

* Increase WebSocket max size of incoming string message

## 2.1.13 (2024-01-19)

### Bug fixes

* Fix empty DataFrame with no columns when no results were returned from the query
* Fix MSSQL credentials expose in logs
* Fix TableQuery. Creates a query with aliases for column names
* Fix blob, clob and nclob display for Oracle
* Fix deadlock when several drivers have been loaded in parallel

## 2.1.12

* Make logging async
* Improve queries logging and debugging

## 2.1.10 - 2.1.11

* Fix categorize()
* Fix NullPointer when update query executed
* Fix Snowflake connection building
* Fix bit type support in columns

## 2.1.9

* Update of Neptune driver version

## 2.1.8 

This release focuses on fixing bugs

### Bug fixes

* Fix connection form of Athena Provider
* Fix exposing sensitive data in logs

## 2.1.7 (2023-07-28)

This release focuses on fixing bugs

### Features

* Add possibility to set log level in command line args when grok connect is starting

### Bug fixes

* Fix connection form of Impala Provider
* Fix datetime parameter set in UTC
* Remove connection pool for Neptune due to memory leak

## 2.1.6 (2023-07-24)

This release focuses on fixing bugs

### Bug fixes

* Fix bug with socket data sending with the size of 100 when fetch size change is not supported
