#!/bin/bash
set -e

CONTAINER=$(docker compose -f docker-dev/docker-compose.dev.yml ps -q nextcloud)

if [ -z "$CONTAINER" ]; then
  echo "Nextcloud container is not running."
  exit 1
fi

echo "Syncing app to container..."
docker exec $CONTAINER mkdir -p /var/www/html/custom_apps/thelab/appinfo
docker exec $CONTAINER mkdir -p /var/www/html/custom_apps/thelab/lib
docker exec $CONTAINER mkdir -p /var/www/html/custom_apps/thelab/templates
docker exec $CONTAINER mkdir -p /var/www/html/custom_apps/thelab/js
docker exec $CONTAINER mkdir -p /var/www/html/custom_apps/thelab/css

docker cp appinfo/. $CONTAINER:/var/www/html/custom_apps/thelab/appinfo/
docker cp lib/.     $CONTAINER:/var/www/html/custom_apps/thelab/lib/
docker cp templates/. $CONTAINER:/var/www/html/custom_apps/thelab/templates/
docker cp js/.      $CONTAINER:/var/www/html/custom_apps/thelab/js/
docker cp css/.     $CONTAINER:/var/www/html/custom_apps/thelab/css/

if [ "$1" != "--php-only" ]; then
  echo "Building frontend..."
  npm run build

  echo "Syncing JS and CSS..."
  docker cp js/.  $CONTAINER:/var/www/html/custom_apps/thelab/js/
  docker cp css/. $CONTAINER:/var/www/html/custom_apps/thelab/css/
fi

echo "Syncing PHP..."
docker cp appinfo/.   $CONTAINER:/var/www/html/custom_apps/thelab/appinfo/
docker cp lib/.       $CONTAINER:/var/www/html/custom_apps/thelab/lib/
docker cp templates/. $CONTAINER:/var/www/html/custom_apps/thelab/templates/
docker cp js/.        $CONTAINER:/var/www/html/custom_apps/thelab/js/
docker cp css/.       $CONTAINER:/var/www/html/custom_apps/thelab/css/

echo "Setting permissions..."
docker exec $CONTAINER chown -R www-data:www-data /var/www/html/custom_apps/thelab

echo "Clearing cache..."
docker exec -u www-data $CONTAINER php occ app:disable thelab 2>/dev/null || true
docker exec -u www-data $CONTAINER php occ app:enable thelab

echo "Done."