# syntax=docker/dockerfile:1

FROM node:22@sha256:cd6fb7efa6490f039f3471a189214d5f548c11df1ff9e5b181aa49e22c14383e AS node-builder

WORKDIR /var/www/html

ARG BUILDER_CONFIGURATION="debug"
ENV BUILDER_CONFIGURATION=$BUILDER_CONFIGURATION

# DOCKER_RUNTIME_PUBLIC env var helps prevent the resource scripts running on the host
ENV DOCKER_RUNTIME_PUBLIC=1

CMD [ "/bin/sh", "./resources/start-public.sh" ]
