# syntax=docker/dockerfile:1

FROM node:24@sha256:934240a162082fd8b8a2f90cd5114446443f1eba1c5378f6687167ca405e6584 AS node-builder

WORKDIR /var/www/html

ARG BUILDER_CONFIGURATION="release"
ENV BUILDER_CONFIGURATION=$BUILDER_CONFIGURATION

# DOCKER_RUNTIME_SERVER env var helps prevent the resource scripts running on the host
ENV DOCKER_RUNTIME_SERVER=1

CMD [ "/bin/sh", "./resources/start-server.sh" ]
