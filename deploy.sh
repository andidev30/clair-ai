#!/usr/bin/env bash

set -e

# Prompt user for what to deploy
echo "What do you want to deploy?"
echo "1) ai"
echo "2) ui"
echo "3) api"
echo "4) all"
read -p "Enter choice (1/2/3/4) or type name (ai/ui/api/all): " choice

deploy_service=""
case "$choice" in
  1|ai) deploy_service="ai" ;;
  2|ui) deploy_service="ui" ;;
  3|api) deploy_service="api" ;;
  4|all) deploy_service="all" ;;
  *) echo "Invalid choice!"; exit 1 ;;
esac

PROJECT_ID=$(gcloud config get-value project 2>/dev/null)
if [ -z "$PROJECT_ID" ]; then
  echo "Error: PROJECT_ID not found. Make sure you are logged in to gcloud."
  exit 1
fi

deploy() {
  local service=$1
  echo "========================================="
  echo "Starting deploy for: $service"
  echo "========================================="
  
  if [ ! -d "$service" ]; then
    echo "Error: directory $service not found!"
    exit 1
  fi
  
  # Copy .env.production ke folder service sementara
  if [ -f ".env.production" ]; then
    cp .env.production "$service/"
  fi

  cd "$service" || exit 1
  
  if [ ! -f "cloudbuild.yaml" ]; then
    echo "Error: cloudbuild.yaml not found inside $service!"
    cd ..
    exit 1
  fi
  
  # Trigger Cloud Build context di dalam folder service
  gcloud builds submit --config="cloudbuild.yaml" .

  # Cleanup
  if [ -f ".env.production" ]; then
    rm -f .env.production
  fi

  cd ..
}

if [ "$deploy_service" = "all" ]; then
  deploy "api"
  deploy "ai"
  deploy "ui"
else
  deploy "$deploy_service"
fi

echo "========================================="
echo "Deploy complete!"
echo "========================================="
