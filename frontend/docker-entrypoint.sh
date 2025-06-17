#!/bin/sh
set -e

# Process nginx template files with environment variables
envsubst '${MINIO_HOST} ${MINIO_PORT} ${MINIO_BUCKET} ${FRONTEND_VERSION} ${API_URL}' < /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf

# Execute the original nginx entrypoint
exec /usr/bin/env nginx -g "daemon off;"
