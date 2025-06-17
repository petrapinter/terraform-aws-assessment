#!/bin/bash
set -e

# Default configuration
VERSION=${1:-latest}
BUILD_DIR="./dist"
MINIO_BUCKET=${MINIO_BUCKET:-"frontend-assets"}

# Check required environment variables
if [ -z "$MINIO_ENDPOINT" ] || [ -z "$MINIO_ACCESS_KEY" ] || [ -z "$MINIO_SECRET_KEY" ]; then
    echo "Error: Required MinIO environment variables are not set."
    echo "Please export MINIO_ENDPOINT, MINIO_ACCESS_KEY, and MINIO_SECRET_KEY"
    exit 1
fi

echo "Building frontend application..."

# Install dependencies if needed
if [ ! -d "node_modules" ] || [ "$2" == "--force-install" ]; then
    echo "Installing dependencies..."
    npm ci
fi

# Build the application
npm run build

if [ ! -d "$BUILD_DIR" ]; then
    echo "Error: Build failed, $BUILD_DIR directory not found"
    exit 1
fi

echo "Frontend built successfully"

# Ensure mc (MinIO client) is installed
if ! command -v mc &> /dev/null; then
    echo "Installing MinIO client..."
    curl -O https://dl.min.io/client/mc/release/linux-amd64/mc
    chmod +x mc
    sudo mv mc /usr/local/bin/
fi

# Configure MinIO client
echo "Configuring MinIO client..."
mc alias set local http://${MINIO_ENDPOINT} ${MINIO_ACCESS_KEY} ${MINIO_SECRET_KEY}

# Check if bucket exists, create if it doesn't
if ! mc ls local | grep -q "$MINIO_BUCKET"; then
    echo "Creating bucket: $MINIO_BUCKET"
    mc mb local/$MINIO_BUCKET
    
    # Set bucket policy to allow public access if needed
    if [ "$PUBLIC_ACCESS" = "true" ]; then
        echo "Setting bucket policy to allow public read access"
        mc policy set download local/$MINIO_BUCKET
    fi
fi

# Upload the build to MinIO
echo "Uploading build to MinIO bucket: $MINIO_BUCKET, version: $VERSION"
mc cp --recursive $BUILD_DIR/ local/$MINIO_BUCKET/$VERSION/

echo "Deployment completed successfully!"
echo "Your frontend is now available at: http://${MINIO_ENDPOINT}/${MINIO_BUCKET}/${VERSION}/"
