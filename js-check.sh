#!/bin/sh
jshint --exclude node_modules $PWD/lib && \
jscs lib/** && \
jshint --exclude node_modules $PWD/test && \
jscs test/**
