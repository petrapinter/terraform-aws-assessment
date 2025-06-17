# Stage 1: Build stage for shared-types
FROM node:20-alpine AS shared-types-builder

# Set working directory
WORKDIR /app

# Copy shared-types source and package files
COPY shared-types/package*.json ./
COPY shared-types/tsconfig.json ./
COPY shared-types/src ./src

# Install dependencies and build
RUN npm ci && npm run build

# Stage 2: Build stage for frontend
FROM node:20-alpine AS frontend-builder

# Set working directory
WORKDIR /app

# Copy package files for frontend
COPY frontend/package*.json ./

# Create shared-types directory and copy built files from previous stage
RUN mkdir -p ./node_modules/shared-types/dist
COPY --from=shared-types-builder /app/dist ./node_modules/shared-types/dist
COPY --from=shared-types-builder /app/package.json ./node_modules/shared-types/

# Install frontend dependencies
RUN npm ci

# Copy frontend source code
COPY frontend/src ./src
COPY frontend/public ./public
COPY frontend/index.html ./
COPY frontend/vite.config.ts ./
COPY frontend/tsconfig.json ./
COPY frontend/tsconfig.node.json ./

# Set environment variables for frontend build
ENV VITE_API_URL=http://localhost:3000

# Build the frontend application
RUN npm run build

# Stage 3: MinIO uploader 
FROM minio/mc AS uploader

# Copy built frontend files from frontend-builder
COPY --from=frontend-builder /app/dist /frontend

# Copy upload script
COPY frontend/upload-to-minio.sh /upload-to-minio.sh
RUN chmod +x /upload-to-minio.sh

# Stage 4: Production nginx stage
FROM nginx:alpine

# Copy nginx configuration template
COPY frontend/nginx/default.conf /etc/nginx/templates/default.conf.template

# Copy custom entrypoint
COPY frontend/docker-entrypoint.sh /

# Install dependencies for environment variable substitution
RUN apk add --no-cache curl bash && \
    chmod +x /docker-entrypoint.sh

# Expose port
EXPOSE 80

# Environment variables for configuration
ENV MINIO_HOST=minio \
    MINIO_PORT=9000 \
    MINIO_BUCKET=frontend-assets \
    FRONTEND_VERSION=latest \
    API_URL=http://backend:3000

# Set custom entrypoint
ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]
