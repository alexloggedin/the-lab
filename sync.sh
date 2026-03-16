#!/bin/bash
set -e

# ---------------------------------------------------------------------------
# sync.sh — copy app files into the Nextcloud dev container
#
# Usage:
#   ./sync.sh               sync PHP only (default during dev)
#   ./sync.sh --prod        build frontend, sync everything, disable vite dev mode
#
# During normal development with `npm run dev:docker`, only PHP files need
# to be synced. Vite serves the frontend directly with hot reload.
# ---------------------------------------------------------------------------

COMPOSE_FILE="docker-dev/docker-compose.dev.yml"
APP_DIR="/var/www/html/custom_apps/thelab"

CONTAINER=$(docker compose -f $COMPOSE_FILE ps -q nextcloud)

if [ -z "$CONTAINER" ]; then
  echo "❌  Nextcloud container is not running."
  echo "    Start it with: docker compose -f $COMPOSE_FILE up -d"
  exit 1
fi

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

sync_php() {
  echo "→ Syncing PHP..."
  docker exec $CONTAINER mkdir -p \
    $APP_DIR/appinfo \
    $APP_DIR/lib \
    $APP_DIR/templates \
    $APP_DIR/js \
    $APP_DIR/css

  docker cp appinfo/.   $CONTAINER:$APP_DIR/appinfo/
  docker cp lib/.       $CONTAINER:$APP_DIR/lib/
  docker cp templates/. $CONTAINER:$APP_DIR/templates/
}

sync_assets() {
  echo "→ Syncing built JS and CSS..."
  docker cp js/.  $CONTAINER:$APP_DIR/js/
  docker cp css/. $CONTAINER:$APP_DIR/css/
}

set_permissions() {
  echo "→ Setting permissions..."
  docker exec $CONTAINER chown -R www-data:www-data $APP_DIR
}

clear_cache() {
  echo "→ Clearing Nextcloud cache..."
  docker exec -u www-data $CONTAINER php occ app:disable thelab 2>/dev/null || true
  docker exec -u www-data $CONTAINER php occ app:enable thelab
}

enable_vite_dev() {
  echo "→ Enabling Vite dev mode (.vite-dev)..."
  docker cp .vite-dev $CONTAINER:$APP_DIR/.vite-dev
}

disable_vite_dev() {
  echo "→ Disabling Vite dev mode..."
  docker exec $CONTAINER rm -f $APP_DIR/.vite-dev
}

# ---------------------------------------------------------------------------
# Modes
# ---------------------------------------------------------------------------

if [ "$1" == "--prod" ]; then
  echo "🚀  Production sync"
  echo ""

  echo "→ Building frontend..."
  npm run build

  sync_php
  sync_assets
  disable_vite_dev
  set_permissions
  clear_cache

  echo ""
  echo "✅  Done. Open http://localhost:8080/index.php/apps/thelab/"

else
  # Default: PHP only — used during `npm run dev:docker`
  echo "🔧  Dev sync (PHP only)"
  echo ""

  sync_php

  # Copy .vite-dev if it exists locally and isn't already in the container
  if [ -f ".vite-dev" ]; then
    VITE_DEV_EXISTS=$(docker exec $CONTAINER test -f $APP_DIR/.vite-dev && echo "yes" || echo "no")
    if [ "$VITE_DEV_EXISTS" != "yes" ]; then
      enable_vite_dev
    fi
  fi

  set_permissions
  clear_cache

  echo ""
  echo "✅  Done. Vite is serving the frontend — no build needed."
fi