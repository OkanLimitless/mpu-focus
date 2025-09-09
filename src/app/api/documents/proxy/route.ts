import { NextRequest, NextResponse } from 'next/server'
import { rateLimit } from '@/lib/rate-limit'

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic'

function getAllowedOrigins(): string[] {
  // Configure allowed origins via ALLOWED_ORIGINS (comma-separated) or NEXT_PUBLIC_APP_URL
  const fromEnv = process.env.ALLOWED_ORIGINS || process.env.NEXT_PUBLIC_APP_URL || ''
  return fromEnv
    .split(',')
    .map(o => o.trim())
    .filter(Boolean)
}

function getCorsHeaders(origin: string | null): Record<string, string> {
  const allowed = getAllowedOrigins()
  const isAllowed = origin && allowed.includes(origin)
  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Vary': 'Origin',
  }
  if (isAllowed && origin) {
    headers['Access-Control-Allow-Origin'] = origin
  }
  return headers
}

export async function GET(request: NextRequest) {
  try {
    // Rate limit: moderate to prevent abuse (60/min)
    const limited = await rateLimit({ request, limit: 60, windowMs: 60 * 1000, keyPrefix: 'doc-proxy' })
    if (!limited.ok) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }

    const { searchParams } = new URL(request.url)
    const fileUrl = searchParams.get('url')

    if (!fileUrl) {
      return NextResponse.json(
        { error: 'File URL is required' },
        { status: 400 }
      )
    }

    // Validate that the URL is from allowed sources (UploadThing and CloudConvert storage)
    const allowedDomains = [
      'utfs.io',                    // Legacy pattern
      'uploadthing.com',           // General UploadThing domain
      'ufs.sh',                    // New v7 pattern (*.ufs.sh)
      'storage.cloudconvert.com',  // CloudConvert storage
      'us-east.storage.cloudconvert.com',
      'eu-central-1.storage.cloudconvert.com'
    ]
    let urlObj: URL
    
    try {
      urlObj = new URL(fileUrl)
    } catch (error) {
      console.error('Invalid URL provided:', fileUrl)
      return NextResponse.json(
        { error: 'Invalid URL format' },
        { status: 400 }
      )
    }

    // Check if the hostname matches any allowed domain or is a subdomain of allowed domains
    const isValidDomain = allowedDomains.some(domain => 
      urlObj.hostname === domain || urlObj.hostname.endsWith('.' + domain)
    )

    if (!isValidDomain) {
      console.error('Unauthorized domain:', urlObj.hostname)
      return NextResponse.json(
        { error: 'Invalid file source - only UploadThing URLs are allowed' },
        { status: 403 }
      )
    }

    console.log('Attempting to fetch document from:', fileUrl)

    // Fetch the file from UploadThing
    const response = await fetch(fileUrl, {
      headers: {
        'User-Agent': 'MPU-Focus-App/1.0'
      }
    })

    console.log('UploadThing response status:', response.status)

    if (!response.ok) {
      console.error(`Failed to fetch file from UploadThing. Status: ${response.status}, URL: ${fileUrl}`)
      
      // Provide more specific error messages based on status
      if (response.status === 404) {
        return NextResponse.json(
          { 
            error: 'Document not found', 
            details: 'The requested document no longer exists or the URL is incorrect. This could be due to UploadThing v7 migration - please try re-uploading the document.',
            url: fileUrl 
          },
          { status: 404 }
        )
      } else if (response.status === 403) {
        return NextResponse.json(
          { 
            error: 'Access denied', 
            details: 'Permission denied to access this document',
            url: fileUrl 
          },
          { status: 403 }
        )
      } else {
        return NextResponse.json(
          { 
            error: 'Failed to fetch document', 
            details: `UploadThing returned status ${response.status}`,
            url: fileUrl 
          },
          { status: response.status }
        )
      }
    }

    // Get the file data
    const fileBuffer = await response.arrayBuffer()
    const contentType = response.headers.get('content-type') || 'application/octet-stream'
    const contentLength = response.headers.get('content-length')

    console.log(`Successfully fetched document. Size: ${fileBuffer.byteLength} bytes, Type: ${contentType}`)

    const origin = request.headers.get('origin')
    const corsHeaders = getCorsHeaders(origin)

    // Create response with proper headers
    const proxyResponse = new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Length': contentLength || fileBuffer.byteLength.toString(),
        ...corsHeaders,
        'Cache-Control': 'private, max-age=60',
        'Content-Disposition': 'inline',
      }
    })

    return proxyResponse

  } catch (error: any) {
    console.error('Document proxy error:', {
      message: error.message,
      stack: error.stack,
      url: new URL(request.url).searchParams.get('url')
    })
    
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: error.message,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}

// Handle preflight requests
export async function OPTIONS(request: NextRequest) {
  // Rate limit OPTIONS lightly as well
  const limited = await rateLimit({ request, limit: 120, windowMs: 60 * 1000, keyPrefix: 'doc-proxy-preflight' })
  if (!limited.ok) {
    return new NextResponse(null, { status: 429 })
  }
  const origin = request.headers.get('origin')
  const corsHeaders = getCorsHeaders(origin)
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders,
  })
}