import { Client } from 'minio';
import { config } from './env';
import { AwsCredentials, getEcsCredentials } from '../utils/ecsCredentials';

// Configure the MinIO client - using only the internal Docker network name
let minioClient: Client;



// Bucket name for media storage
const BUCKET_NAME = config.storage.bucket;

// Ensure bucket exists on startup
export const initializeStorage = async (): Promise<void> => {
  let credentials: AwsCredentials = {
    accessKeyId: config.storage.accessKey,
    secretAccessKey: config.storage.secretKey,
    sessionToken: '',
    expiration: ''
  };
  if (config.storage.accessKey === '' || config.storage.secretKey === '') {
    console.log("We're running in ECS.")
    credentials = await getEcsCredentials();
  }
  minioClient = new Client({
    endPoint: config.storage.internalEndpoint || 'minio',
    port: config.storage.port,
    useSSL: config.storage.useSSL,
    accessKey: credentials.accessKeyId,
    secretKey: credentials.secretAccessKey,
    sessionToken: credentials.sessionToken === '' ? undefined : credentials.sessionToken,
    pathStyle: true,
    region: config.storage.region
  });
  // Check if bucket exists
  const bucketExists = await minioClient.bucketExists(BUCKET_NAME);
  
  if (!bucketExists) {
    await minioClient.makeBucket(BUCKET_NAME, config.storage.region);
    console.log(`Created bucket: ${BUCKET_NAME}`);
  } else {
    console.log(`Bucket ${BUCKET_NAME} already exists`);
  }
  
  console.log(`Storage configuration:`);
  console.log(` - MinIO client: ${config.storage.internalEndpoint}:${config.storage.port}`);
  console.log(` - Public URL: ${config.storage.publicUrl}`);
  console.log(` - Bucket: ${BUCKET_NAME}`);
};

// Export the client and bucket name
export { minioClient, BUCKET_NAME };
