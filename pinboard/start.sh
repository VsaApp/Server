#!/usr/bin/env bash

if [ "$mode" = "production" ]; then
    echo "Starting in production mode"
    cd client && yarn build && cd ..
else
    echo "Starting in development mode"
    cd client && yarn start &
fi

cd api && yarn start
