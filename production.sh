#!/usr/bin/env bash
docker-compose -f docker-compose.yaml -f production.yaml up $1
