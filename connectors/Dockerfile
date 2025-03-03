ARG HOME_DIR=/home/grok
ARG GROK_CONNECT_DIR=${HOME_DIR}/grok_connect

FROM datagrok/openjdk:8 as grok_connect_builder

ARG HOME_DIR

ENV GROK_SRC /tmp

ARG GROK_CONNECT_SOURCE_DIR=.

COPY $GROK_CONNECT_SOURCE_DIR/pom.xml /tmp/connectors/pom.xml
COPY $GROK_CONNECT_SOURCE_DIR/grok_connect/pom.xml /tmp/connectors/grok_connect/pom.xml
COPY $GROK_CONNECT_SOURCE_DIR/serialization/pom.xml /tmp/connectors/serialization/pom.xml

WORKDIR /tmp/connectors
RUN mvn dependency:go-offline --fail-never

COPY $GROK_CONNECT_SOURCE_DIR /tmp/connectors
ARG GROK_CONNECT_DIR
ARG DEBIAN_FRONTEND=noninteractive
RUN set -ex ; \
    savedAptMark="$(apt-mark showmanual)" ; \
    apt-get update ; \
    apt-get install -y --no-install-recommends \
      unzip \
      zip \
    ; \
    mvn -Dmaven.test.skip=true package ; \
    mkdir -p ${GROK_CONNECT_DIR} ; \
    mv /tmp/connectors/grok_connect/lib ${GROK_CONNECT_DIR}/lib ; \
    mv /tmp/connectors/grok_connect/target/grok_connect-*.jar ${GROK_CONNECT_DIR}/grok_connect.jar ; \
    apt-mark auto '.*' > /dev/null ; \
    [ -z "$savedAptMark" ] || apt-mark manual $savedAptMark ; \
    apt-get purge -y --auto-remove -o APT::AutoRemove::RecommendsImportant=false ; \
    apt-get clean ; \
    rm -rf /var/lib/apt/lists/* /var/cache/* /var/tmp/* /tmp/*

FROM datagrok/openjdk:8 as main

# Grok user
ARG HOME_DIR
ARG GROK_CONNECT_DIR
ENV GROK_CONNECT_DIR=${GROK_CONNECT_DIR}
ENV GROK_CONNECT_PORT=1234

RUN groupadd --gid 2001 grok ; \
    useradd --system --create-home --home ${HOME_DIR} --gid grok --uid 1001 grok

COPY --chown=grok:grok --from=grok_connect_builder ${GROK_CONNECT_DIR} ${GROK_CONNECT_DIR}
COPY $GROK_CONNECT_SOURCE_DIR/grok_connect/northwind ${HOME_DIR}/northwind
# https://docs.aws.amazon.com/sdk-for-java/v1/developer-guide/jvm-ttl-dns.html
RUN echo "networkaddress.cache.ttl=5" >> $JAVA_HOME/jre/lib/security/java.security

USER grok:grok
WORKDIR ${GROK_CONNECT_DIR}

# GrokConnect
EXPOSE ${GROK_CONNECT_PORT}

ENTRYPOINT ["java", "-Xmx4g", "-classpath", "grok_connect.jar:lib/*", "grok_connect.GrokConnect"]

ARG BRANCH
ARG COMMIT_PUBLIC
LABEL branch=$BRANCH
LABEL commit-public=$COMMIT_PUBLIC

RUN echo "Branch main: $BRANCH" > ${HOME_DIR}/git-info.txt ; \
echo "Commit public: $COMMIT_PUBLIC" >> ${HOME_DIR}/git-info.txt
