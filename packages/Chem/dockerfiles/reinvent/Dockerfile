FROM python:3.10

ARG DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get -y upgrade && \
    apt-get install -y --no-install-recommends \
    curl \
    wget \
    git \
    unzip \
    tar \
    bzip2 \
    xz-utils \
    libgomp1 \
    swig \
    cmake \
    build-essential \
    python3-dev \
    libeigen3-dev \
    zlib1g-dev && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

RUN git clone https://github.com/MolecularAI/REINVENT4.git && \
    git clone https://github.com/MolecularAI/DockStream.git

# Fix issues by modifying specific scripts in the REINVENT repository
# Replace calls to `model_dump()` with `model_config` due to compatibility problems
RUN find /app/REINVENT4/reinvent -type f \( -name "Reinvent.py" -o -name "run_staged_learning.py" \) \
    -exec sed -i 's/model_dump()/model_config/g' {} +

COPY . /app

RUN python3.10 -m venv /app/venv && \
    /app/venv/bin/pip install --upgrade pip && \
    /app/venv/bin/pip install -r requirements-macOS.lock && \
    cd /app/REINVENT4 && \
    /app/venv/bin/pip install --no-deps .

# Install Miniforge for macOS compatibility (handles macOS-specific Python environment issues)
RUN if [ "$(uname -m)" = "aarch64" ]; then \
        curl -fsSL https://github.com/conda-forge/miniforge/releases/latest/download/Miniforge3-Linux-aarch64.sh -o /tmp/miniforge.sh; \
    else \
        curl -fsSL https://github.com/conda-forge/miniforge/releases/latest/download/Miniforge3-Linux-x86_64.sh -o /tmp/miniforge.sh; \
    fi && \
    bash /tmp/miniforge.sh -b -p /opt/conda && \
    rm /tmp/miniforge.sh

USER root

ENV PATH="/opt/conda/bin:$PATH"

RUN conda update -n base -c defaults conda -y

WORKDIR /app/DockStream

# Update DockStream environment file:
# - Change Python version to 3.10
# - Remove incompatible `pydantic` version and manually specify compatible version
RUN sed -i 's/python = 3.7/python = 3.10/' environment.yml && \
    sed -i '/pydantic/d' environment.yml && \
    sed -i '/dependencies:/a \  - pip' environment.yml && \
    sed -i '/- pip/a \  - pip:\n    - pydantic==1.10.19' environment.yml

RUN conda env create -f environment.yml && \
    conda clean --all --yes

RUN chmod -R 777 /opt/conda/envs/DockStream

# AWS CLI installation and models download
RUN conda install -n base -c conda-forge awscli -y && \
    conda run -n base aws s3 cp s3://datagrok-data/models/reinvent /app --no-sign-request --recursive --region us-east-2 && \
    conda remove -n base awscli -y && \
    conda clean --all --yes

WORKDIR /app

RUN mkdir -p /app/autodock_vina && \
    curl -L https://vina.scripps.edu/wp-content/uploads/sites/55/2020/12/autodock_vina_1_1_2_linux_x86.tgz -o /app/autodock_vina.tar.gz && \
    tar -xzvf /app/autodock_vina.tar.gz -C /app/autodock_vina && \
    rm /app/autodock_vina.tar.gz

RUN /app/venv/bin/pip install Flask

RUN /app/venv/bin/pip install descriptastorus

RUN /app/venv/bin/pip install toml

RUN /app/venv/bin/pip install flask_cors

ENV PATH="/app/venv/bin:$PATH"

EXPOSE 6666

ENTRYPOINT ["python", "reinvent.py", "--host", "0.0.0.0", "--port", "6666"]