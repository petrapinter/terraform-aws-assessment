#!/bin/sh
set -e

# Default configuration
MINIO_ENDPOINT=${MINIO_HOST}:${MINIO_PORT}
BUCKET_NAME=${MINIO_BUCKET:-frontend-assets}
VERSION=${FRONTEND_VERSION:-latest}

echo "Waiting for MinIO to be ready..."
until mc alias set myminio http://${MINIO_ENDPOINT} ${MINIO_ACCESS_KEY} ${MINIO_SECRET_KEY} > /dev/null 2>&1; do
  sleep 1
done
echo "MinIO is ready"

# Check if bucket exists, create if not
if ! mc ls myminio | grep -q ${BUCKET_NAME}; then
  echo "Creating bucket: ${BUCKET_NAME}"
  mc mb myminio/${BUCKET_NAME}
  
  # Set public policy
  echo "Setting bucket policy to public"
  mc policy set download myminio/${BUCKET_NAME}
else
  echo "Bucket ${BUCKET_NAME} already exists"
fi

# Upload frontend assets
echo "Uploading frontend assets to MinIO..."
mc cp --recursive /frontend/ myminio/${BUCKET_NAME}/${VERSION}/

echo "Frontend assets uploaded successfully"
echo "Your frontend is now available at: http://${MINIO_ENDPOINT}/${BUCKET_NAME}/${VERSION}/"
