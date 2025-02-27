FROM nvidia/cuda:11.8.0-runtime-ubuntu22.04

SHELL ["/bin/bash", "-c"]

ARG DEBIAN_FRONTEND=noninteractive
RUN apt update && apt install -y --no-install-recommends \
    gcc curl bzip2 ca-certificates \
    libstdc++6 libgcc1 \
    libc6 libssl-dev build-essential git \
    && apt clean

ENV MAMBA_EXE=/bin/micromamba
ARG MAMBA_VERSION=1.5.3
RUN set -ex ; \
    curl -L "https://micro.mamba.pm/api/micromamba/linux-64/${MAMBA_VERSION}" --output /tmp/micromamba.tar.bz2; \
    mkdir -p /tmp/micromamba ; \
    tar --bzip2 --extract -C /tmp/micromamba --strip-components=1 -f /tmp/micromamba.tar.bz2 ; \
    mv /tmp/micromamba/micromamba "${MAMBA_EXE}" ; \
    rm -rf /tmp/micromamba

ARG MAMBA_USER=mambauser
ARG MAMBA_USER_ID=57439
ARG MAMBA_USER_GID=57439
ENV MAMBA_USER=$MAMBA_USER
ENV MAMBA_USER_GID=$MAMBA_USER_GID
ENV MAMBA_USER_ID=$MAMBA_USER_ID
ENV MAMBA_ROOT_PREFIX=/opt/conda
COPY --from=mambaorg/micromamba:latest /usr/local/bin/_dockerfile_initialize_user_accounts.sh /usr/local/bin/_dockerfile_initialize_user_accounts.sh
COPY --from=mambaorg/micromamba:latest /usr/local/bin/_dockerfile_setup_root_prefix.sh /usr/local/bin/_dockerfile_setup_root_prefix.sh
RUN /usr/local/bin/_dockerfile_initialize_user_accounts.sh && /usr/local/bin/_dockerfile_setup_root_prefix.sh

RUN mkdir /app && chown $MAMBA_USER:$MAMBA_USER /app

USER $MAMBA_USER

WORKDIR /app

COPY --chown=$MAMBA_USER:$MAMBA_USER environment.yml /app/

RUN mkdir -p /home/mambauser/.boltz && chown -R $MAMBA_USER:$MAMBA_USER /home/mambauser

RUN micromamba install -n base -c conda-forge awscli -y && \
    micromamba run -n base aws s3 cp s3://datagrok-data/models/boltz /app/boltz_weights --no-sign-request --recursive --region us-east-2 && \
    micromamba remove -n base awscli -y && \
    micromamba clean -afy && \
    mkdir -p /home/mambauser/.boltz && \
    mv /app/boltz_weights/* /home/mambauser/.boltz/ && \
    rmdir /app/boltz_weights && \
    chown -R $MAMBA_USER:$MAMBA_USER /home/mambauser/.boltz

RUN set -ex ; \
    micromamba env create -f environment.yml -y ; \
    micromamba clean -afy

RUN git clone https://github.com/jwohlwend/boltz.git && \
    cd boltz && \
    micromamba run -n myenv pip install -e .

ENV PATH="/opt/conda/envs/myenv/bin:$PATH"

COPY --chown=$MAMBA_USER:$MAMBA_USER . /app

EXPOSE 8001

SHELL ["micromamba", "run", "-n", "myenv", "/bin/bash", "-c"]

ENTRYPOINT ["micromamba", "run", "-n", "myenv", "python", "-m", "app", "--host", "0.0.0.0", "--port", "8001"]