#!/bin/bash

set -e

echo "Building frontend..."
mvn -pl frontend -am package -DskipTests

echo "Building docker image..."
mvn -pl docker -am package -DskipTests

echo "Restarting docker container..."
cd docker && docker-compose down && docker-compose up -d

echo "Build completed successfully!"
