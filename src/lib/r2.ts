// r2.ts - Cloudflare R2 helper using AWS S3 SDK
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'

const r2Endpoint = process.env.R2_S3_ENDPOINT || ''
const r2Bucket = process.env.R2_BUCKET || ''
const r2KeyId = process.env.R2_ACCESS_KEY_ID || ''
const r2Secret = process.env.R2_SECRET_ACCESS_KEY || ''

let s3Client: S3Client | null = null

export function getR2Client(): S3Client {
  if (!s3Client) {
    s3Client = new S3Client({
      region: 'auto',
      endpoint: r2Endpoint,
      credentials: {
        accessKeyId: r2KeyId,
        secretAccessKey: r2Secret,
      },
      forcePathStyle: true,
    })
  }
  return s3Client
}

export async function uploadBufferToR2(key: string, body: Uint8Array | Buffer, contentType = 'application/octet-stream') {
  const client = getR2Client()
  await client.send(new PutObjectCommand({
    Bucket: r2Bucket,
    Key: key,
    Body: body,
    ContentType: contentType,
    ACL: 'public-read',
    CacheControl: 'public, max-age=86400',
  }))
}