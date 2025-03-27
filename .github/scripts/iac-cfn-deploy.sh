#!/bin/bash

set -ex

action=${1:-'merge,lint'}

if [[ $action == *"merge"* ]]; then
    echo "Installing dependencies for merge script..."
    python3 -V
    python3 -m pip install pyyaml deepmerge argparse cfn-lint awscli
    echo "Creating CFN scripts from templates using merge script..."
    python3 help/deploy/aws/cloudformation/templates/cf_template_merge.py -i help/deploy/aws/cloudformation/templates/create_network.template.yml \
     -i help/deploy/aws/cloudformation/templates/fargate.template.yml \
     -i help/deploy/aws/cloudformation/templates/r53.template.yml \
     -i help/deploy/aws/cloudformation/templates/marketplace.template.yml \
     -i help/deploy/aws/cloudformation/templates/versions.template.yml \
     -o help/deploy/aws/cloudformation/network-fargate-r53-marketplace.yml
    python3 help/deploy/aws/cloudformation/templates/cf_template_merge.py -i help/deploy/aws/cloudformation/templates/create_network.template.yml \
     -i help/deploy/aws/cloudformation/templates/fargate.template.yml \
     -i help/deploy/aws/cloudformation/templates/dns.template.yml \
     -i help/deploy/aws/cloudformation/templates/marketplace.template.yml \
     -i help/deploy/aws/cloudformation/templates/versions.template.yml \
     -o help/deploy/aws/cloudformation/network-fargate-dns-marketplace.yml
    python3 help/deploy/aws/cloudformation/templates/cf_template_merge.py -i help/deploy/aws/cloudformation/templates/choose_vpc.template.yml \
     -i help/deploy/aws/cloudformation/templates/fargate.template.yml \
     -i help/deploy/aws/cloudformation/templates/dns.template.yml \
     -i help/deploy/aws/cloudformation/templates/marketplace.template.yml \
     -i help/deploy/aws/cloudformation/templates/versions.template.yml \
     -o help/deploy/aws/cloudformation/vpc-fargate-dns-marketplace.yml
    python3 help/deploy/aws/cloudformation/templates/cf_template_merge.py -i help/deploy/aws/cloudformation/templates/choose_vpc.template.yml \
     -i help/deploy/aws/cloudformation/templates/fargate.template.yml \
     -i help/deploy/aws/cloudformation/templates/r53.template.yml \
     -i help/deploy/aws/cloudformation/templates/marketplace.template.yml \
     -i help/deploy/aws/cloudformation/templates/versions.template.yml \
     -o help/deploy/aws/cloudformation/vpc-fargate-r53-marketplace.yml
    python3 help/deploy/aws/cloudformation/templates/cf_template_merge.py -i help/deploy/aws/cloudformation/templates/create_network.template.yml \
     -i help/deploy/aws/cloudformation/templates/fargate.template.yml \
     -i help/deploy/aws/cloudformation/templates/r53.template.yml \
     -i help/deploy/aws/cloudformation/templates/basic.template.yml \
     -i help/deploy/aws/cloudformation/templates/versions.template.yml \
     -o help/deploy/aws/cloudformation/network-fargate-r53-basic.yml
    python3 help/deploy/aws/cloudformation/templates/cf_template_merge.py -i help/deploy/aws/cloudformation/templates/choose_vpc.template.yml \
     -i help/deploy/aws/cloudformation/templates/fargate.template.yml \
     -i help/deploy/aws/cloudformation/templates/r53.template.yml \
     -i help/deploy/aws/cloudformation/templates/basic.template.yml \
     -i help/deploy/aws/cloudformation/templates/versions.template.yml \
     -o help/deploy/aws/cloudformation/vpc-fargate-r53-basic.yml
    python3 help/deploy/aws/cloudformation/templates/cf_template_merge.py -i help/deploy/aws/cloudformation/templates/create_network.template.yml \
     -i help/deploy/aws/cloudformation/templates/fargate.template.yml \
     -i help/deploy/aws/cloudformation/templates/dns.template.yml \
     -i help/deploy/aws/cloudformation/templates/basic.template.yml \
     -i help/deploy/aws/cloudformation/templates/versions.template.yml \
     -o help/deploy/aws/cloudformation/network-fargate-dns-basic.yml
    python3 help/deploy/aws/cloudformation/templates/cf_template_merge.py -i help/deploy/aws/cloudformation/templates/choose_vpc.template.yml \
     -i help/deploy/aws/cloudformation/templates/fargate.template.yml \
     -i help/deploy/aws/cloudformation/templates/dns.template.yml \
     -i help/deploy/aws/cloudformation/templates/basic.template.yml \
     -i help/deploy/aws/cloudformation/templates/versions.template.yml \
     -o help/deploy/aws/cloudformation/vpc-fargate-dns-basic.yml
fi

if [[ $action == *"lint"* ]]; then
    echo "Linting CFN scripts..."
    cfn-lint --version
    cfn-lint -t help/deploy/aws/cloudformation/*.yml || true
fi

if [[ $action == *"deploy"* ]]; then
    yq -V
    datagrok_version=$(yq .Parameters.DatagrokVersion.Default help/deploy/aws/cloudformation/templates/versions.template.yml)

    echo "Copying to S3 basic CFN scripts..."
    for f in help/deploy/aws/cloudformation/*-basic.yml; do
        file=$(basename "$f")
        aws s3 cp "$f" "s3://datagrok-data/deployment/$file" --acl public-read;
    done


    echo "Copying to S3 CFN scripts for AWS marketplace..."
    for f in help/deploy/aws/cloudformation/*-marketplace.yml; do
        file=$(basename "$f")
        latest_s3_pushed=$(aws s3api list-objects-v2 --bucket datagrok-data --prefix "deployment/${file%.yml}-${datagrok_version}" --query 'Contents == null || (Contents| sort_by(@, &LastModified) | [-1].Key)' --output text)
        if [[ $latest_s3_pushed == "True" ]]; then
            new_version="deployment/${file%.yml}-${datagrok_version}-0.yml"
        else
            new_version=$(echo "$latest_s3_pushed" | sed -E 's/(.+-)([0-9]+)(\.yml)/echo "\1$((\2+1))\3"/e')
        fi
        aws s3 cp "$f" "s3://datagrok-data/${new_version}" --acl public-read;
    done
fi
