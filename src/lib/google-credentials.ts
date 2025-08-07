/**
 * Google Cloud Credentials Helper
 * Handles base64 encoded service account credentials from environment variables
 */

export interface GoogleCredentials {
  type: string;
  project_id: string;
  private_key_id: string;
  private_key: string;
  client_email: string;
  client_id: string;
  auth_uri: string;
  token_uri: string;
  auth_provider_x509_cert_url: string;
  client_x509_cert_url: string;
}

/**
 * Parse Google Cloud credentials from base64 environment variable
 * @returns Parsed credentials object
 * @throws Error if credentials are missing or invalid
 */
export function parseGoogleCredentials(): GoogleCredentials {
  const base64Credentials = process.env.GOOGLE_CREDENTIALS_BASE64;
  
  if (!base64Credentials) {
    throw new Error(
      'GOOGLE_CREDENTIALS_BASE64 environment variable is required. ' +
      'Please set it to the base64 encoded service account JSON.'
    );
  }

  try {
    const credentialsJson = Buffer.from(base64Credentials, 'base64').toString('utf8');
    const credentials = JSON.parse(credentialsJson) as GoogleCredentials;
    
    // Validate required fields
    const requiredFields = ['type', 'project_id', 'private_key', 'client_email'];
    for (const field of requiredFields) {
      if (!credentials[field as keyof GoogleCredentials]) {
        throw new Error(`Missing required field '${field}' in credentials`);
      }
    }
    
    return credentials;
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(
        'Invalid base64 credentials format. Please ensure GOOGLE_CREDENTIALS_BASE64 ' +
        'contains a valid base64 encoded service account JSON.'
      );
    }
    throw error;
  }
}

/**
 * Get Google Cloud project ID from credentials
 * @returns Project ID string
 */
export function getGoogleProjectId(): string {
  const credentials = parseGoogleCredentials();
  return credentials.project_id;
}

/**
 * Validate that Google Cloud credentials are properly configured
 * @returns true if valid, throws error if invalid
 */
export function validateGoogleCredentials(): boolean {
  try {
    const credentials = parseGoogleCredentials();
    
    // Additional validation
    if (credentials.type !== 'service_account') {
      throw new Error('Credentials must be for a service account');
    }
    
    return true;
  } catch (error) {
    throw new Error(`Google Cloud credentials validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}