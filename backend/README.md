# Media Sharing Platform Backend

This is the backend API service for the Media Sharing Platform. It provides endpoints for uploading, retrieving, and commenting on media items.

## Technology Stack

- **Framework**: Hono.js with TypeScript
- **Database**: PostgreSQL with Knex.js as the query builder
- **Object Storage**: MinIO for storing images and videos
- **Type Safety**: Shared type definitions with the frontend

## Project Structure

```
backend/
├── migrations/            # Database migrations
├── src/
│   ├── config/            # Configuration files
│   │   ├── database.ts    # PostgreSQL/Knex configuration
│   │   └── storage.ts     # MinIO configuration
│   ├── routes/            # API routes
│   │   ├── mediaRoutes.ts # Media-related endpoints
│   │   └── commentRoutes.ts # Comment-related endpoints
│   ├── services/          # Business logic
│   │   ├── mediaService.ts  # Media operations
│   │   └── commentService.ts # Comment operations
│   └── index.ts           # Application entry point
├── knexfile.js            # Knex configuration for migrations
├── package.json           # Dependencies and scripts
└── tsconfig.json          # TypeScript configuration
```

## Prerequisites

- Node.js (v18+)
- PostgreSQL
- MinIO

## Environment Variables

The application uses the following environment variables:

```
# Server
PORT=3000

# Database
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=media_sharing

# MinIO
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_USE_SSL=false
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET=media-sharing
MINIO_REGION=us-east-1
MINIO_PUBLIC_URL=http://localhost:9000
```

## Setup and Running

1. Install dependencies:
   ```
   npm install
   ```

2. Set up PostgreSQL:
   ```
   createdb media_sharing
   ```

3. Run migrations:
   ```
   npx knex migrate:latest
   ```

4. Start MinIO (using Docker):
   ```
   docker run -p 9000:9000 -p 9001:9001 --name minio \
     -e "MINIO_ROOT_USER=minioadmin" \
     -e "MINIO_ROOT_PASSWORD=minioadmin" \
     -v minio-data:/data \
     minio/minio server /data --console-address ":9001"
   ```

5. Start the development server:
   ```
   npm run dev
   ```

## API Endpoints

### Media

- `GET /api/media` - Get paginated media items
- `GET /api/media/:id` - Get a single media item by ID
- `POST /api/media` - Upload a new media item (multipart/form-data)

### Comments

- `GET /api/comments/:mediaId` - Get comments for a media item
- `POST /api/comments/:mediaId` - Add a comment to a media item

## Frontend Integration

The backend shares type definitions with the frontend via the `shared-types` package. This ensures type consistency between the client and server.
