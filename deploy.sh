#!/usr/bin/env bash

set -e

# Prompt user for what to deploy
echo "Apa yang ingin Anda deploy?"
echo "1) ai"
echo "2) ui"
echo "3) api"
echo "4) all"
read -p "Masukkan pilihan (1/2/3/4) atau ketik nama (ai/ui/api/all): " choice

deploy_service=""
case "$choice" in
  1|ai) deploy_service="ai" ;;
  2|ui) deploy_service="ui" ;;
  3|api) deploy_service="api" ;;
  4|all) deploy_service="all" ;;
  *) echo "Pilihan tidak valid!"; exit 1 ;;
esac

PROJECT_ID=$(gcloud config get-value project 2>/dev/null)
if [ -z "$PROJECT_ID" ]; then
  echo "Error: PROJECT_ID tidak ditemukan. Pastikan Anda sudah login ke gcloud."
  exit 1
fi

deploy() {
  local service=$1
  echo "========================================="
  echo "Memulai deploy untuk: $service"
  echo "========================================="
  
  if [ ! -d "$service" ]; then
    echo "Error: direktori $service tidak ditemukan!"
    exit 1
  fi
  
  # Copy .env.production ke folder service sementara
  if [ -f ".env.production" ]; then
    cp .env.production "$service/"
  fi

  cd "$service" || exit 1
  
  if [ ! -f "cloudbuild.yaml" ]; then
    echo "Error: cloudbuild.yaml tidak ditemukan di dalam $service!"
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
echo "Deploy selesai!"
echo "========================================="
