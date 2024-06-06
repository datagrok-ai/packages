# Use an official Ubuntu runtime as a parent image
FROM ubuntu:20.04

# Set the environment variable to avoid prompts
ARG DEBIAN_FRONTEND=noninteractive

# Install necessary packages including X11 libraries
RUN apt-get update && apt-get -y upgrade && \
    apt-get install -y \
    apt-utils \
    unzip \
    tar \
    curl \
    xz-utils \
    wget \
    bzip2 \
    build-essential \
    libxrender1 \
    libxext6 \
    libsm6 \
    libxml2 \
    && rm -rf /var/lib/apt/lists/*

# Set up Miniforge for managing Conda environments
RUN wget https://github.com/conda-forge/miniforge/releases/latest/download/Miniforge3-Linux-x86_64.sh -O /tmp/miniforge.sh \
    && /bin/bash /tmp/miniforge.sh -b -p /usr/local/miniforge \
    && rm /tmp/miniforge.sh

# Update PATH to include Conda
ENV PATH="/usr/local/miniforge/bin:$PATH"

# Install Mamba for faster environment management
RUN conda install -c conda-forge mamba

# Create Conda environment with Python 2.7
RUN mamba create -n autodock python=2.7

# Activate the Conda environment and install necessary packages
RUN echo "source activate autodock" > ~/.bashrc
ENV PATH="/usr/local/miniforge/envs/autodock/bin:$PATH"

# Install Flask and Open Babel in the Conda environment
RUN /usr/local/miniforge/envs/autodock/bin/pip install Flask
RUN conda install -n autodock -c conda-forge openbabel

# Create app directory
RUN mkdir -p /app

# Download and install the ADFR suite
RUN wget https://ccsb.scripps.edu/adfr/download/1038/ADFRsuite_x86_64Linux_1.0.tar.gz -O /tmp/ADFRsuite_x86_64Linux_1.0.tar.gz \
    && tar -xzf /tmp/ADFRsuite_x86_64Linux_1.0.tar.gz -C /app

# Ensure the installation script runs in the correct directory
WORKDIR /app/ADFRsuite_x86_64Linux_1.0

# Run the installation script
RUN ./install.sh -d /opt/adfrsuite -c 0

# Set environment variables for the ADFR suite
ENV PATH="/opt/adfrsuite/bin:${PATH}"

# Set the working directory back to /app
WORKDIR /app

# Copy the current directory contents into the container at /app
COPY . /app

# Expose port 8000 for the Flask app
EXPOSE 8000

# Use a script to activate the conda environment and run the Flask app
ENTRYPOINT ["/bin/bash", "-c", "source activate autodock && python adcp.py --host 0.0.0.0 --port 8000"]