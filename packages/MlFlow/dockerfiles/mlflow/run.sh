#!/bin/sh

echo "RUNNING mlflow model serving for ${MODEL_NAME}:${MODEL_VERSION} using host ${MLFLOW_TRACKING_URI}"
mlflow models serve -m models:/${MODEL_NAME}/${MODEL_VERSION} --host 0.0.0.0 -p 5001