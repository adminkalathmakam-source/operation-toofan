#!/usr/bin/env bash
# Exit on error
set -o errexit

echo "===> Step 1: Installing Python backend dependencies..."
pip install --upgrade pip
pip install -r backend/requirements.txt

echo "===> Step 2: Installing frontend dependencies..."
npm --prefix frontend install

echo "===> Step 3: Building production React frontend..."
npm --prefix frontend run build

echo "===> Step 4: Ensuring SPA fallback routes exist..."
mkdir -p frontend/dist/pay
cp frontend/dist/index.html frontend/dist/pay/index.html

echo "===> [OK] Build completed successfully!"
