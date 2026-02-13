#!/usr/bin/env bash
## START STANDARD SITE BUILD SCRIPT INCLUDE
readonly THIS_SCRIPT="$(readlink -f "${BASH_SOURCE[0]}")"
readonly BOOTSTRAP="$(dirname "$THIS_SCRIPT")/resources/bootstrap.inc.sh"
readonly BOOTSTRAP_VERSION=v1.0.10
if ! [ -f "$BOOTSTRAP" ] || ! source "$BOOTSTRAP"; then
  curl -H "Cache-Control: no-cache" --fail --silent --show-error -w "curl: Finished attempt to download %{url}" "https://raw.githubusercontent.com/keymanapp/shared-sites/$BOOTSTRAP_VERSION/bootstrap.inc.sh" -o "$BOOTSTRAP.tmp" || exit 1
  source "$BOOTSTRAP.tmp"
  rm -f "$BOOTSTRAP.tmp"
fi
## END STANDARD SITE BUILD SCRIPT INCLUDE

source _common/keyman-local-ports.inc.sh
source _common/docker.inc.sh

readonly HOST_STATUS_KEYMAN_COM=status.keyman.com.localhost

readonly THIS_CONTAINER_NAME=status-keyman-website
readonly PUBLIC_CONTAINER_NAME=status-keyman-public
readonly THIS_CONTAINER_DESC=status-keyman-com-app
readonly PUBLIC_CONTAINER_DESC=status-keyman-com-public
readonly THIS_IMAGE_NAME=status-keyman-website
readonly PUBLIC_IMAGE_NAME=status-keyman-public
readonly THIS_HOST="$HOST_STATUS_KEYMAN_COM"
readonly PUBLIC_HOST="$HOST_STATUS_KEYMAN_COM" # same host
readonly THIS_PORT="$PORT_STATUS_KEYMAN_COM"
readonly PUBLIC_PORT="$PORT_STATUS_KEYMAN_COM_PUBLIC"


################################ Main script ################################

builder_describe \
  "Setup status.keyman.com site to run via Docker." \
  configure \
  clean \
  build \
  start \
  stop \
  test

builder_parse "$@"

function build_docker_containers() {
  build_docker_container $THIS_IMAGE_NAME $THIS_CONTAINER_NAME $BUILDER_CONFIGURATION server.Dockerfile
  if builder_is_debug_build; then
    build_docker_container $PUBLIC_IMAGE_NAME $PUBLIC_CONTAINER_NAME $BUILDER_CONFIGURATION public.Dockerfile
  fi
}

function start_docker_containers() {
  start_docker_container $THIS_IMAGE_NAME $THIS_CONTAINER_NAME $THIS_CONTAINER_DESC $THIS_HOST $THIS_PORT $BUILDER_CONFIGURATION
  if builder_is_debug_build; then
    start_docker_container $PUBLIC_IMAGE_NAME $PUBLIC_CONTAINER_NAME $PUBLIC_CONTAINER_DESC $PUBLIC_HOST $PUBLIC_PORT $BUILDER_CONFIGURATION
  fi
}

function stop_docker_containers() {
  rm -f ./_control/ready
  stop_docker_container  $THIS_IMAGE_NAME $THIS_CONTAINER_NAME
  # always stop all containers - even in release build
  stop_docker_container  $PUBLIC_IMAGE_NAME $PUBLIC_CONTAINER_NAME
}

function clean_docker_containers() {
  clean_docker_container $THIS_IMAGE_NAME $THIS_CONTAINER_NAME
  # always clean all containers - even in release build
  clean_docker_container $PUBLIC_IMAGE_NAME $PUBLIC_CONTAINER_NAME
}

function do_clean() {
  clean_docker_containers
  rm -rf ./server/node_modules ./server/dist
  rm -rf ./public/node_modules ./public/angular ./public/dist
  rm -rf ./public/angular
  rm -rf ./_common
  rm -rf ./resources/.bootstrap-registry ./resources/bootstrap-version ./resources/bootstrap.inc.sh
}

function test_docker_container() {
  stop_docker_container $THIS_IMAGE_NAME $THIS_CONTAINER_NAME
  MSYS_NO_PATHCONV=1 start_docker_container $THIS_IMAGE_NAME $THIS_CONTAINER_NAME $THIS_CONTAINER_DESC $THIS_HOST $THIS_PORT $BUILDER_CONFIGURATION "/bin/sh" "./resources/test.sh"
}

builder_run_action configure  bootstrap_configure
builder_run_action clean      do_clean
builder_run_action stop       stop_docker_containers
builder_run_action build      build_docker_containers
builder_run_action start      start_docker_containers
builder_run_action test       test_docker_container
