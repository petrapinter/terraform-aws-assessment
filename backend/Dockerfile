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

# Stage 2: Build stage for backend
FROM node:20-alpine AS backend-builder

# Set working directory
WORKDIR /app

# Copy package files and install dependencies
COPY backend/package*.json ./

# Create shared-types directory and copy built files from previous stage
COPY --from=shared-types-builder /app /shared-types

# Install backend dependencies
RUN npm ci

# Copy backend source code
COPY backend/src ./src
COPY backend/tsconfig.json ./
COPY backend/migrations ./migrations

# Build the backend application (including migrations and config)
RUN npm run build
# Stage 3: Production stage
FROM node:20-alpine AS production

# Install dependencies required for the health check, database connection, and video thumbnail generation
RUN apk --no-cache add curl postgresql-client ffmpeg

# Set working directory
WORKDIR /app

# Set environment variable
ENV NODE_ENV=production

# Copy configuration files first
COPY --from=backend-builder /app/package*.json ./
COPY --from=backend-builder /app/tsconfig.json ./

# Install only production dependencies
RUN npm ci --only=production --no-audit --no-fund

# Copy compiled application
COPY --from=backend-builder /app/dist ./

# Copy shared-types to node_modules
COPY --from=shared-types-builder /app/dist ./node_modules/shared-types/dist
COPY --from=shared-types-builder /app/package.json ./node_modules/shared-types/package.json

# Add a health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 CMD curl -f http://localhost:3000/health || exit 1

# Expose port
EXPOSE 3000

# Copy entrypoint script
COPY backend/docker-entrypoint.sh /app/docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh

# Set user to non-root for security
USER node

# Start the application using our entrypoint script
CMD ["/app/docker-entrypoint.sh"]
