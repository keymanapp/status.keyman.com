# syntax=docker/dockerfile:1

# debian bookworm / node 24.22.1
FROM node:24@sha256:6449e19d8184d84062525b6a7524def03146c2cb04a7f08b076680d0e8e4240a AS node-builder

WORKDIR /var/www/html

ARG BUILDER_CONFIGURATION="debug"
ENV BUILDER_CONFIGURATION=$BUILDER_CONFIGURATION

# DOCKER_RUNTIME_PUBLIC env var helps prevent the resource scripts running on the host
ENV DOCKER_RUNTIME_PUBLIC=1

CMD [ "/bin/sh", "./resources/start-public.sh" ]
