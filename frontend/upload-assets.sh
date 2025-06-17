#!/bin/bash
set -e

# Colors for better output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Default configuration
VERSION=${1:-latest}
MINIO_ENDPOINT=${MINIO_ENDPOINT:-"localhost:9000"}
MINIO_ACCESS_KEY=${MINIO_ACCESS_KEY:-"minioadmin"}
MINIO_SECRET_KEY=${MINIO_SECRET_KEY:-"minioadmin"}
MINIO_BUCKET=${MINIO_BUCKET:-"frontend-assets"}
PUBLIC_ACCESS=${PUBLIC_ACCESS:-"true"}

echo -e "${BLUE}Uploading frontend assets to MinIO...${NC}"

# Check if frontend build exists
if [ -d "dist" ]; then
    echo -e "${GREEN}Frontend build found in 'dist' directory.${NC}"
else
    echo -e "${YELLOW}No 'dist' directory found, building frontend...${NC}"
    
    # Install dependencies if needed
    if [ ! -d "node_modules" ]; then
        echo -e "${YELLOW}Installing dependencies...${NC}"
        npm ci
    fi
    
    # Build the application
    echo -e "${YELLOW}Building frontend application...${NC}"
    npm run build
    
    if [ ! -d "dist" ]; then
        echo -e "${RED}Error: Build failed, 'dist' directory not found${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}Frontend built successfully.${NC}"
fi

# Ensure MinIO client is installed
if ! command -v mc &> /dev/null; then
    echo -e "${YELLOW}Installing MinIO client...${NC}"
    curl -s -O https://dl.min.io/client/mc/release/linux-amd64/mc
    chmod +x mc
    sudo mv mc /usr/local/bin/
fi

# Configure MinIO client
echo -e "${YELLOW}Configuring MinIO client...${NC}"
mc alias set local http://${MINIO_ENDPOINT} ${MINIO_ACCESS_KEY} ${MINIO_SECRET_KEY}

# Check if bucket exists, create if it doesn't
if ! mc ls local | grep -q "${MINIO_BUCKET}"; then
    echo -e "${YELLOW}Creating bucket: ${MINIO_BUCKET}${NC}"
    mc mb local/${MINIO_BUCKET}
    
    # Set bucket policy to allow public access if needed
    if [ "${PUBLIC_ACCESS}" = "true" ]; then
        echo -e "${YELLOW}Setting bucket policy to allow public read access${NC}"
        mc anonymous set download local/${MINIO_BUCKET}
    fi
else
    echo -e "${YELLOW}Bucket ${MINIO_BUCKET} already exists, checking permissions...${NC}"
    # Ensure bucket has correct permissions
    mc anonymous set download local/${MINIO_BUCKET}
fi

# Upload the build to MinIO
echo -e "${YELLOW}Uploading build to MinIO bucket: ${MINIO_BUCKET}, version: ${VERSION}${NC}"
mc cp --recursive dist/ local/${MINIO_BUCKET}/${VERSION}/

# In case frontend build fails or is empty, create a placeholder file
if [ -z "$(mc ls local/${MINIO_BUCKET}/${VERSION}/ | grep -v '/$')" ]; then
    echo -e "${YELLOW}No files found in MinIO bucket, creating placeholder file...${NC}"
    echo '<html><body><h1>Frontend Placeholder</h1><p>This confirms MinIO access is working correctly. Frontend assets have not been built and uploaded yet.</p></body></html>' > /tmp/index.html
    mc cp /tmp/index.html local/${MINIO_BUCKET}/${VERSION}/index.html
    rm /tmp/index.html
fi

echo -e "${GREEN}Frontend deployment completed successfully!${NC}"
echo -e "${BLUE}Your frontend should now be available at: http://localhost:81${NC}"
