#!/bin/bash

# This script automates the Datagrok local installation and running
# To see additional actions, run "./datagrok-install-local help"

set -o errexit

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
RESET='\033[0m'
timeout=30

compose_config_name="localhost.docker-compose.yaml"
datagrok_public_repo_url="https://raw.githubusercontent.com/datagrok-ai/public/master/docker/${compose_config_name}"
datagrok_local_url="http://localhost:8080/"

script_name="$0"
script_dir=$(dirname "$(readlink -f "$0")" )
compose_config_path="${script_dir}/${compose_config_name}"


function message() {
    echo -e "${YELLOW}$1${RESET}"
}

function error() {
    echo -e "${RED}!!!$1!!!${RESET}"
}

function user_query_yn() {
    echo -ne "${YELLOW}"
    read -r -p "${1} (y/N)" answer
    echo -ne "${RESET}"
    if [[ $answer =~ ^(Y|y) ]] ; then
        return 0 # 0 = True
    else
        return 1 # 1 = False
    fi
}

function count_down() {
    echo -n "Waiting:"
    for ((i = ${1} ; i > 0 ; i--)); do
        echo -n " $i"
        sleep 1
    done
    echo " 0"
}

function check_docker() {
    if [ ! -x "$(command -v docker)" ]; then
        error "Docker engine is not installed"
        message "Please install Docker and Docker Compose plugin by manual: https://docs.docker.com/engine/install/"
        exit 255
    fi
}

function check_installation() {
    if [ ! -f "${compose_config_path}" ]; then
        return 1 # False
    else 
        docker_image=$(docker images -q "datagrok/datagrok")
        if [ ! -n "$docker_image" ]; then
            return 1 # False
        fi
    fi
    return 0 # True
}

function datagrok_install() {
    if [ ! -f "${compose_config_path}" ]; then
        message "Downloading Datagrok config file"
        curl -o ${compose_config_path} ${datagrok_public_repo_url}
    fi
    message "Pulling Datagrok images (this can take a while depending on your Internet connection speed)"
    docker compose -f "${compose_config_path}" --profile all pull
}

function datagrok_start() {
    if ! check_installation; then
        datagrok_install
    fi
    message "Starting Datagrok containers"
    docker compose -f "${compose_config_path}" --project-name datagrok --profile all up -d
    message "Waiting while the Datagrok server is starting"
    echo "When the browser opens, use the following credentials to log in:"
    echo "------------------------------"
    echo -ne "${GREEN}"
    echo "Login:    admin"
    echo "Password: admin"
    echo -ne "${RESET}"
    echo "------------------------------"
    echo "If you see the message 'Datagrok server is unavaliable' just wait for a while and reload the web page "
    count_down ${timeout}
    message "Running browser"
    xdg-open ${datagrok_local_url}
    message "If the browser hasn't open, use the following link: $datagrok_local_url"
    message "To extend Datagrok fucntionality, install extension packages on the 'Manage -> Packages' page"
}

function datagrok_stop() {
    if ! check_installation; then
        message "The Datagrok installation not found. Nothing to stop."
        exit 255
    fi
    message "Stopping Datagrok containers"
    docker compose -f "${compose_config_path}" --project-name datagrok --profile all stop
}

function datagrok_reset() {
    if ! check_installation; then
        message "The Datagrok installation not found. Nothing to reset."
        exit 255
    fi
    if user_query_yn "This action will stop Datagrok, remove all user settings, data and installed packages. Are you sure?"; then
        docker compose -f "${compose_config_path}" --project-name datagrok --profile all stop
        docker compose -f "${compose_config_path}" --project-name datagrok --profile all down --volumes
    fi
}

function datagrok_purge() {
    if ! check_installation; then
        message "The Datagrok installation not found. Nothing to remove."
        exit 255
    fi
    if user_query_yn "This action will stop Datagrok and COMPLETELY remove Datagrok installation. Are you sure?"; then
        docker compose -f "${compose_config_path}" --project-name datagrok --profile all down --volumes
        docker rmi $(docker images -q datagrok/*)
    fi
}


# === Main part of the script starts from here ===
check_docker

case "$1" in
    install) datagrok_install ;;
    start)   datagrok_start ;;
    stop)    datagrok_stop ;;
    reset)   datagrok_reset ;;
    purge)   datagrok_purge ;;
    help|"-h"|"--help") echo "usage: $script_name install|start|stop|reset" >&2 ; exit 1 ;;
    *) datagrok_start
esac
