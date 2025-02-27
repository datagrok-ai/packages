#!/usr/bin/env bash

# Builds "GrokConnect" server or runs as shell application
#
#  Requirements:
#    * jdk 8 (https://www.oracle.com/technetwork/java/javase/downloads/jdk8-downloads-2133151.html)
#    * maven 3+ (https://maven.apache.org/install.html)
#
# Parameters:
#    * mode: test/run/shell
#
#
# "shell" mode:
#
#    Template:
#        bash grok_connect_shell.sh <mode> <args>
#
#    where:
#      * mode - run/build
#      * args:
#          -q, --query  <arg>   Query JSON file path
#          -o, --output <arg>   Output CSV file path (optional, if is not specified CSV will be printed into console)
#
#    see query json example in "query_example.json"
#
#    Examples:
#        bash grok_connect.sh shell build -q examples/query.json -o output.csv
#        bash grok_connect.sh shell build -q examples/query.json
#        bash grok_connect.sh shell -q examples/query.json
#
DART_SDK="$(which dart)"
DART_PUB=$(which pub)


current_dir=$(pwd)
GROK_SRC="${GROK_SRC:=$current_dir/../../}"

# Base project directory and executable
GROK_CONNECT_DIR=grok_connect
GROK_CONNECT=grok_connect-2.3.29.jar
TARGET_DIR=${GROK_CONNECT_DIR}/target

set -e
if [ "$1" == "shell" ]; then
    shift

    if [ "$1" == "build" ]; then
        shift
        rm -rf ${TARGET_DIR}
        mvn -Dmaven.test.skip=true package
    fi

    java -Xmx4g -classpath ${GROK_CONNECT_DIR}/lib/*:${TARGET_DIR}/${GROK_CONNECT} grok_connect.GrokConnectShell "$@"
else
    # Remove target
    rm -rf ${TARGET_DIR}

    if [ "$1" == "test" ]; then
        # Get dart test dependencies
        cd $GROK_SRC/ddt
        ${DART_PUB} get

        cd $GROK_SRC/grok_shared
        ${DART_PUB} get

        cd $GROK_SRC/ddt/bin/serialization_test
        ${DART_PUB} get

        cd $GROK_SRC/public/connectors

        # Build project
        mvn package
    else
        # Build project
        mvn -Dmaven.test.skip=true package
    fi

    # Pack into zip
    cd $GROK_SRC/public/connectors || exit 1
    ZIP_TMP_DIR=${TARGET_DIR}/grok_connect
    mkdir ${ZIP_TMP_DIR}
    echo "java -Xmx4g -classpath ${GROK_CONNECT}:lib/* grok_connect.GrokConnect" > ${ZIP_TMP_DIR}/run_grok_connect.sh
    cp ${TARGET_DIR}/${GROK_CONNECT} ${ZIP_TMP_DIR}/${GROK_CONNECT}
    cp -R ${GROK_CONNECT_DIR}/lib ${ZIP_TMP_DIR}/lib
    CUR_DIR=$(pwd)
    cd ${ZIP_TMP_DIR}
    zip -r ../grok_connect.zip *
    cd ${CUR_DIR}
    rm -rf ${ZIP_TMP_DIR}

    # Run connector server with shared libraries
    if [ "$1" == "run" ]; then
        java -Xmx4g -classpath ${TARGET_DIR}/${GROK_CONNECT}:${GROK_CONNECT_DIR}/lib/* grok_connect.GrokConnect
    fi
fi
