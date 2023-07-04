#!/bin/bash

set -ex

command=$1
expected_result=$2
exact_match=$3

result=$(eval "$command")

if [[ "$exact_match" == "true" ]]; then
    if [[ "$result" == "$expected_result" ]]; then
        exit 0
    else
        exit 1
    fi
else
    echo -e "${result}" | grep "${expected_result}"
fi
