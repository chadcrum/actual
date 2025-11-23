#!/bin/bash
set -e

echo "Stopping containers..."
podman-compose down

echo "Building server artifacts..."
yarn build:server

echo "Building and starting containers..."
podman-compose up --build -d

echo "Done! Actual server should be running at http://localhost:5006"

