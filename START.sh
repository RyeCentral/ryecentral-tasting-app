#!/bin/bash
# ═══════════════════════════════════════════════════════
#  RyeCentral Tasting App — Quick Start
# ═══════════════════════════════════════════════════════
#
#  Run this from the ryecentral-tasting-app folder:
#    chmod +x START.sh && ./START.sh
#
#  It will install deps, build the client, and start
#  the server in production mode at http://localhost:3001
#
# ═══════════════════════════════════════════════════════

set -e

echo "🥃 RyeCentral Tasting App — Starting Up..."
echo ""

# Install server deps
echo "📦 Installing server dependencies..."
cd server
npm install --silent
cd ..

# Install client deps + build
echo "📦 Installing client dependencies..."
cd client
npm install --silent
echo "🔨 Building React app..."
npx react-scripts build 2>&1 | tail -5
cd ..

# Start server (serves both API + React build)
echo ""
echo "🚀 Starting server in production mode..."
echo ""
NODE_ENV=production node server/index.js
