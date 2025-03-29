---
title: "AWS Terraform"
sidebar_position: 2
---

The deployment consists of a few docker containers, [database](../../develop/under-the-hood/infrastructure.md#1-core-components) for storing metadata,
and [persistent file storage](../../develop/under-the-hood/infrastructure.md#1-core-components) for storing files

This document contains instructions to deploy Datagrok using [Terraform](https://www.terraform.io/)
on [AWS ECS cluster](https://aws.amazon.com/ecs/) with [AWS RDS](https://aws.amazon.com/rds/)
and [AWS S3](https://aws.amazon.com/s3/).

We considered a lot of typical security nuances during the Terraform code development. As a result, you will
create a Datagrok infrastructure in AWS that applies to all standard security policies.

More information about Datagrok design and components:

* [Architecture](../../develop/under-the-hood/architecture.md)
* [Infrastructure](../../develop/under-the-hood/infrastructure.md)

## Basic usage

### Prerequisites

1. Check that you
   have [required permissions](https://github.com/datagrok-ai/public/blob/master/help/develop/admin/deploy/iam.list)
   on AWS account to perform Terraform deployment to ECS. The `cloudformation` permissions are optional.
2. Check that you
   have required [S3 permissions](https://www.terraform.io/language/settings/backends/s3#s3-bucket-permissions)
   and [DynamoDB permissions](https://www.terraform.io/language/settings/backends/s3#dynamodb-table-permissions)

3. [Create access token in Docker Hub](https://docs.docker.com/docker-hub/access-tokens/)

4. Come up with two endpoints: `DATAGROK_DNS`, `CVM_DNS`. Datagrok requires two endpoints: `DATAGROK_DNS` and `CVM_DNS`.
   Users will use `DATAGROK_DNS` to access Datagrok Web UI, and requests `CVM_DNS` will be sent automatically by
   Datagrok Client.

## Deploy Datagrok components

1. Download Terraform
   Template: [link](https://github.com/datagrok-ai/public/blob/master/help/deploy/aws/terraform/terraform.tf)
   .

2. Replace the placeholders in the template with the actual values

   * SET_YOUR_S3_BUCKET_FOR_TERRAFORM_STATE - the unique S3 bucket name to store Terraform state
   * SET_YOUR_REGION - target region to create Datagrok Infrastructure

3. [Setup AWS credentials to run Terraform code](https://developer.hashicorp.com/terraform/language/settings/backends/s3#credentials-and-shared-configuration)

4. Apply Terraform code

   ```shell
   terraform init --upgrade
   terraform apply -target module.datagrok_core
   terraform apply -target module.datagrok_cvm
   ```

5. After the Datagrok container starts, the Datagrok server will deploy the database. You can check the status by
   checking the running task log in [CloudWatch](https://aws.amazon.com/cloudwatch/)

### Configure Datagrok settings

1. Go into the web browser to `DATAGROK_DNS`, login to Datagrok using username `admin` and unique password, which was
   generated during terraform run. You can find it in the `GROK_PARAMETERS` environment variable in the datagrok task
   definition.
2. Edit settings in the Datagrok (Tools | Settings...). Remember to click Apply to save new settings.

   * Scripting:
     * CVM URL Client: `https://<CVM_DNS>`
   * Dev:
     * CVM Url: `https://<CVM_DNS>`

## Advanced usage

The Terraform code is highly configurable. Feel free to adapt the code and variables to meet your needs and
requirements.
Terraform modules documentation:

* [Datagrok Core README](https://github.com/datagrok-ai/tf-module-datagrok-core/blob/main/aws/README.md)
* [Datagrok CVM README](https://github.com/datagrok-ai/tf-module-datagrok-cvm/blob/main/aws/README.md)
