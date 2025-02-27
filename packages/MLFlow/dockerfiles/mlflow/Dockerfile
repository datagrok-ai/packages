FROM ghcr.io/mlflow/mlflow:latest as base

ENV MLFLOW_TRACKING_URI=http://192.168.1.101:5000
ENV MODEL_NAME=datagrok-linear-regression
ENV MODEL_VERSION=1

COPY run.sh run.sh
RUN chmod +x run.sh

RUN apt-get -y update && apt-get install -y curl git gcc make
RUN apt-get -y update && apt-get install -y --no-install-recommends make build-essential libssl-dev zlib1g-dev libbz2-dev libreadline-dev libsqlite3-dev wget curl llvm libncurses5-dev xz-utils tk-dev libxml2-dev libxmlsec1-dev libffi-dev liblzma-dev
RUN apt-get install -y mecab-ipadic-utf8
RUN python -v
RUN curl https://pyenv.run | bash \
	&& python -m  pip install virtualenv
RUN python -m pip install --upgrade pip
RUN python -m pip install boto3
ENV PATH="/root/.pyenv/bin:${PATH}"
RUN pyenv install 3.10.15
RUN pyenv install 3.12.2
RUN pyenv install 3.11.9

EXPOSE 5001
CMD ["./run.sh"]
