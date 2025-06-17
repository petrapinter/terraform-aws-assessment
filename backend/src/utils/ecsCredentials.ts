import axios from 'axios';

/**
 * Represents AWS credentials retrieved from ECS task metadata
 */
export interface AwsCredentials {
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken: string;
  expiration: string;
}

/**
 * Fetches AWS credentials from the ECS task role metadata endpoint
 * 
 * When running in an ECS task with an assigned IAM role, AWS credentials are available
 * via the container metadata endpoint. This function retrieves those credentials.
 * 
 * @returns Promise resolving to AWS credentials
 * @throws Error if credentials cannot be retrieved
 */
export async function getEcsCredentials(): Promise<AwsCredentials> {
  try {
    // The ECS container metadata endpoint path is provided via environment variable
    const metadataUri = process.env.AWS_CONTAINER_CREDENTIALS_RELATIVE_URI;
    
    if (!metadataUri) {
      throw new Error('AWS_CONTAINER_CREDENTIALS_RELATIVE_URI not set. Are you running in ECS with a task role?');
    }
    
    // Full URL to the credentials endpoint
    const credentialsUrl = `http://169.254.170.2${metadataUri}`;
    
    // Fetch credentials from the metadata service
    const response = await axios.get(credentialsUrl);
    
    if (response.status !== 200) {
      throw new Error(`Failed to retrieve credentials: ${response.status} ${response.statusText}`);
    }
    
    // Transform the response data to match our interface
    const credentials: AwsCredentials = {
      accessKeyId: response.data.AccessKeyId,
      secretAccessKey: response.data.SecretAccessKey,
      sessionToken: response.data.Token,
      expiration: response.data.Expiration
    };
    
    return credentials;
  } catch (error: any) {
    console.error('Error retrieving ECS role credentials:', error);
    throw new Error(`Failed to retrieve ECS role credentials: ${error.message}`);
  }
}
