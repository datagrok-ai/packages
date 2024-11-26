---
title: "Stand-alone server"
sidebar_position: 3
---

The deployment consists of a few docker containers, [database](../../develop/under-the-hood/infrastructure.md#database) for storing metadata,
and [persistent file storage](../../develop/under-the-hood/infrastructure.md#storage) for storing files

Datagrok requires PostgreSQL [database](../../develop/under-the-hood/infrastructure.md#database) to store metadata.
We recommend using scalable and highly reliable solutions, such as [AWS RDS](https://aws.amazon.com/rds/).

For [persistent file storage](../../develop/under-the-hood/infrastructure.md#storage), Datagrok supports a lot of options, including cloud solutions,
for example [AWS S3](https://aws.amazon.com/s3/) and Local File System storage.

This document contains instructions to deploy Datagrok using [Docker Сompose](https://docs.docker.com/compose/)
on virtual machines or dedicated hosts with Local File System for persistent storage.

More information about Datagrok design and components:

* [Architecture](../../develop/under-the-hood/architecture.md)
* [Infrastructure](../../develop/under-the-hood/infrastructure.md)

## Prerequisites

### 1. System Requirements
- **Minimal**: 50 GB free disk space, 4 CPUs, 16 GB RAM.
- **Recommended**: 50+ GB free disk space, 8+ CPUs, 32+ GB RAM.

### 2. Install Docker Compose
- Download and install the latest version of [Docker Compose](https://docs.docker.com/compose/install/).

---

## Preparation

1. **Download Docker Compose Configuration**
    - Obtain the `docker-compose.yml` file: [link](https://github.com/datagrok-ai/public/blob/master/docker/localhost.docker-compose.yaml).

2. **Pull Required Docker Images**
   ```bash
   docker compose -f localhost.docker-compose.yaml pull
   ```
## Setup Datagrok components

### 1. Persistent Storage

#### a. Local Docker Volume (Default)

Datagrok uses a local Docker volume as persistent storage by default.

#### b. Cloud Storage (AWS S3)

To configure AWS S3 for persistent storage:

1. Replace the `GROK_PARAMETERS` section in the downloaded `localhost.docker-compose.yaml` file with the following:

   ```json
   {
      "amazonStorageRegion": "<S3_BUCKET_REGION>",
      "amazonStorageBucket": "<S3_BUCKET_NAME>",
      "amazonStorageId": "<S3_BUCKET_CREDS_ACCOUNT_ID>",
      "amazonStorageKey": "<S3_BUCKET_CREDS_SECRET_KEY>"
   }
   ```
### 2. Database

#### a. Local Database (Default)

To use a local database, update the GROK_PARAMETERS section in the localhost.docker-compose.yaml file:

   ```json
   {
      "dbServer": "db",
      "dbPort": "5432",
      "db": "datagrok",
      "dbLogin": "datagrok",
      "dbPassword": "SoMeVeRyCoMpLeXpAsSwOrD",
      "dbAdminLogin": "postgres",
      "dbAdminPassword": "postgres"
  }  
   ```

#### b. Cloud Database

Deploy a database in your cloud provider and update the GROK_PARAMETERS section with the necessary details:

1. Replace the `GROK_PARAMETERS` section in the downloaded `localhost.docker-compose.yaml` file with the following:

   ```json
   {
      "dbServer": "<DATABASE_SERVER>",
      "dbPort": "5432",
      "db": "datagrok",
      "dbLogin": "datagrok",
      "dbPassword": "SoMeVeRyCoMpLeXpAsSwOrD",
      "dbAdminLogin": "<DATABASE_ADMIN_LOGIN>",
      "dbAdminPassword": "<DATABASE_ADMIN_PASSWORD>"
   }
   ```

## Deploy Datagrok

Run the deployment process using Docker Compose:
   ```bash
    docker compose -f localhost.docker-compose.yaml up -d
   ```
## Verify Deployment
1.	Access Datagrok:
   Open your browser and navigate to http://<DATAGROK_VM_IP_ADDRESS>:8080.
2.	Login Credentials:
      •	Username: admin
      •	Password: admin


