import env from 'env-var';

/**
 * Central configuration for all environment variables with validation
 */
export const config = {
  server: {
    port: env.get('PORT').default('3000').asPortNumber(),
    trusted_origins: env.get('TRUSTED_ORIGINS').default('http://localhost:3000').asArray(),
    allowed_headers: env.get('ALLOWED_HEADERS').default('*').asArray(),
    
  },
  
  database: {
    host: env.get('DB_HOST').default('localhost').asString(),
    port: env.get('DB_PORT').default('5432').asPortNumber(),
    user: env.get('DB_USER').default('postgres').asString(),
    password: env.get('DB_PASSWORD').default('postgres').asString(),
    database: env.get('DB_NAME').default('media_sharing').asString(),
  },
  
  storage: {
    endpoint: env.get('BLOB_STORAGE_ENDPOINT').default('localhost').asString(),
    internalEndpoint: env.get('BLOB_STORAGE_INTERNAL_ENDPOINT').default('localhost').asString(),
    port: env.get('BLOB_STORAGE_PORT').default('9000').asPortNumber(),
    useSSL: env.get('BLOB_STORAGE_USE_SSL').default('false').asBool(),
    accessKey: env.get('BLOB_STORAGE_ACCESS_KEY').default('').asString(),
    secretKey: env.get('BLOB_STORAGE_SECRET_KEY').default('').asString(),
    bucket: env.get('BLOB_STORAGE_BUCKET').default('media-sharing').asString(),
    region: env.get('BLOB_STORAGE_REGION').default('eu-central-1').asString(),
    publicUrl: env.get('BLOB_STORAGE_PUBLIC_URL').default('localhost').asString(),
  },
};
