import { NextRequest, NextResponse } from 'next/server'

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const fileUrl = searchParams.get('url')

    if (!fileUrl) {
      return NextResponse.json(
        { error: 'File URL is required' },
        { status: 400 }
      )
    }

    // Validate that the URL is from UploadThing
    const allowedDomains = ['utfs.io', 'uploadthing.com']
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

    if (!allowedDomains.some(domain => urlObj.hostname.includes(domain))) {
      console.error('Unauthorized domain:', urlObj.hostname)
      return NextResponse.json(
        { error: 'Invalid file source' },
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
            details: 'The requested document no longer exists or the URL is incorrect',
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

    // Create response with proper headers
    const proxyResponse = new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Length': contentLength || fileBuffer.byteLength.toString(),
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Cache-Control': 'public, max-age=3600', // Reduced cache time for debugging
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
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    }
  })
}