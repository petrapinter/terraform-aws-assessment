#!/bin/bash
set -e

# Colors for better output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}Starting Media Sharing Platform...${NC}"

# Check if docker and docker-compose are installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}Error: docker is not installed. Please install docker first.${NC}"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}Error: docker-compose is not installed. Please install docker-compose first.${NC}"
    exit 1
fi

# Start the docker-compose environment
echo -e "${YELLOW}Starting Docker containers...${NC}"
docker-compose up -d

# Wait for services to be ready
echo -e "${YELLOW}Waiting for services to be ready...${NC}"
sleep 10  # Initial wait

# Check if PostgreSQL is ready
echo -e "${YELLOW}Checking if PostgreSQL is ready...${NC}"
MAX_RETRIES=30
RETRY_COUNT=0

while ! docker-compose exec postgres pg_isready -U postgres &> /dev/null; do
    RETRY_COUNT=$((RETRY_COUNT+1))
    if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
        echo -e "${RED}Error: PostgreSQL failed to start after multiple attempts.${NC}"
        exit 1
    fi
    echo -e "${YELLOW}Waiting for PostgreSQL to be ready... (Attempt $RETRY_COUNT/$MAX_RETRIES)${NC}"
    sleep 2
done

echo -e "${GREEN}PostgreSQL is ready!${NC}"

# Wait for MinIO to be ready
echo -e "${YELLOW}Checking if MinIO is ready...${NC}"
RETRY_COUNT=0

while ! curl -s http://localhost:9000/minio/health/live &> /dev/null; do
    RETRY_COUNT=$((RETRY_COUNT+1))
    if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
        echo -e "${RED}Error: MinIO failed to start after multiple attempts.${NC}"
        exit 1
    fi
    echo -e "${YELLOW}Waiting for MinIO to be ready... (Attempt $RETRY_COUNT/$MAX_RETRIES)${NC}"
    sleep 2
done

echo -e "${GREEN}MinIO is ready!${NC}"

# Ensure buckets are properly configured with correct permissions
echo -e "${YELLOW}Ensuring MinIO buckets are properly configured...${NC}"
docker-compose exec minio mc alias set local http://localhost:9000 minioadmin minioadmin
docker-compose exec minio mc mb -p local/media-sharing
docker-compose exec minio mc mb -p local/frontend-assets
docker-compose exec minio mc anonymous set download local/media-sharing
docker-compose exec minio mc anonymous set download local/frontend-assets

# Verify the buckets are properly configured
echo -e "${YELLOW}Verifying MinIO bucket permissions...${NC}"
docker-compose exec minio mc anonymous get local/frontend-assets

# Check backend health
echo -e "${YELLOW}Checking backend health...${NC}"
RETRY_COUNT=0
MAX_RETRIES=10

while ! curl -s http://localhost:3000/health &> /dev/null; do
    RETRY_COUNT=$((RETRY_COUNT+1))
    if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
        echo -e "${YELLOW}Backend health check not responding. Restarting backend...${NC}"
        docker-compose restart backend
        sleep 5
        
        # Second attempt after restart
        if ! curl -s http://localhost:3000/health &> /dev/null; then
            echo -e "${RED}Warning: Backend health check still failing. The application might not work correctly.${NC}"
        else
            echo -e "${GREEN}Backend is now healthy after restart!${NC}"
        fi
        break
    fi
    echo -e "${YELLOW}Waiting for backend to be healthy... (Attempt $RETRY_COUNT/$MAX_RETRIES)${NC}"
    sleep 2
done

if [ $RETRY_COUNT -lt $MAX_RETRIES ]; then
    echo -e "${GREEN}Backend is healthy!${NC}"
fi

# Build frontend and upload to MinIO
echo -e "${YELLOW}Building and uploading frontend to MinIO...${NC}"

# Set environment variables for the frontend build script
export MINIO_ENDPOINT="localhost:9000"
export MINIO_ACCESS_KEY="minioadmin"
export MINIO_SECRET_KEY="minioadmin"
export MINIO_BUCKET="frontend-assets"
export PUBLIC_ACCESS="true"

# Use our improved upload script
chmod +x frontend/upload-assets.sh
cd frontend
./upload-assets.sh latest
cd ..

echo -e "${GREEN}==========================================${NC}"
echo -e "${GREEN}✅ Media Sharing Platform is ready!${NC}"
echo -e "${GREEN}==========================================${NC}"
echo -e "${BLUE}Frontend URL: ${NC}http://localhost"
echo -e "${BLUE}Backend API: ${NC}http://localhost:3000"
echo -e "${BLUE}MinIO Console: ${NC}http://localhost:9001 (minioadmin/minioadmin)"
echo -e "${BLUE}PostgreSQL: ${NC}localhost:5432 (postgres/postgres)"
echo -e "${GREEN}==========================================${NC}"
