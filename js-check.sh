#!/bin/sh
jshint --exclude node_modules $PWD/lib
jscs lib/**
jscs test/**