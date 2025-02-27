:: Builds "GrokConnect" server or runs as shell application
::
:: Requirements:
::   * jdk 8 (https://www.oracle.com/technetwork/java/javase/downloads/jdk8-downloads-2133151.html)
::   * maven 3+ (https://maven.apache.org/install.html)
::
:: Parameters:
::   * mode: test/run/shell
::
::
:: "shell" mode:
::
::    Template:
::        grok_connect_shell.cmd <mode> <args>
::
::    where:
::      * mode - run/build
::      * args:
::          -q, --query  <arg>   Query JSON file path
::          -o, --output <arg>   Output CSV file path (optional, if is not specified CSV will be printed into console)
::
::    see query json example in "query_example.json"
::
::    Examples:
::        grok_connect.cmd shell build -q examples\query.json -o output.csv
::        grok_connect.cmd shell build -q examples\query.json
::        grok_connect.cmd shell -q examples\query.json
::
@echo off
set GROK_CONNECT_DIR=grok_connect
set GROK_CONNECT=grok_connect-2.3.29.jar
set TARGET_DIR=%GROK_CONNECT_DIR%\target

if "%1" == "shell" (
    set REST_ARGS=%*
    call set REST_ARGS=%%REST_ARGS:*%1=%%

    if "%2" == "build" (
        del /s /q %TARGET_DIR%
        mvn -Dmaven.test.skip=true package
        call set REST_ARGS=%%REST_ARGS:*%2=%%
    )

    java -Xmx4g -classpath %GROK_CONNECT_DIR%\lib\*;%TARGET_DIR%\%GROK_CONNECT% grok_connect.GrokConnectShell %REST_ARGS%
) else (
    :: Remove target
    del /s /q %TARGET_DIR%

    if "%1" == "test" (
        :: Get dart test dependencies
        cd ..\ddt
        call pub get

        cd ..\grok_shared
        call pub get

        cd ..\ddt\bin\serialization_test
        call pub get

        cd ..\..\..\public\connectors

        :: Build project
        call mvn package
    ) else (
        :: Build project
        mvn -Dmaven.test.skip=true package
    )

    :: Run connector server with shared libraries
    if "%1" == "run" (
        call java -Xmx4g -classpath %GROK_CONNECT_DIR%\lib\*;%TARGET_DIR%\%GROK_CONNECT% grok_connect.GrokConnect
        pause
    )
)
