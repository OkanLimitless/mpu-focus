import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import connectDB from '@/lib/mongodb'
import User from '@/models/User'
import { UTApi } from 'uploadthing/server'

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic'

interface DocumentError {
  userId: string
  email: string
  filename?: string
  error?: string
  suggestions?: string[]
}

interface VerificationResults {
  total: number
  verified: number
  missing: number
  fixed: number
  errors: DocumentError[]
}

// Helper function to construct UploadThing URLs
function constructUploadThingUrl(fileKey: string, appId: string = 'app'): string {
  // Try v7 pattern first, then fallback to legacy
  return `https://${appId}.ufs.sh/f/${fileKey}`
}

function constructLegacyUrl(fileKey: string): string {
  return `https://utfs.io/f/${fileKey}`
}

export async function POST(request: NextRequest) {
  try {
    await connectDB()

    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check if user is admin
    const adminUser = await User.findOne({ email: session.user.email })
    if (!adminUser || adminUser.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      )
    }

    // Find all users with passport documents
    const usersWithDocuments = await User.find({
      'passportDocument.filename': { $exists: true, $ne: null }
    }).select('_id email passportDocument')

    const results: VerificationResults = {
      total: usersWithDocuments.length,
      verified: 0,
      missing: 0,
      fixed: 0,
      errors: []
    }

    console.log(`Starting verification for ${usersWithDocuments.length} users with documents`)

    try {
      // Get all files from UploadThing using the API
      const utapi = new UTApi()
      console.log('Fetching files from UploadThing API...')
      
      const uploadThingFiles = await utapi.listFiles()
      
      if (!uploadThingFiles.files) {
        console.error('Failed to fetch files from UploadThing API')
        return NextResponse.json(
          { error: 'Failed to fetch files from UploadThing API' },
          { status: 500 }
        )
      }

      console.log(`Found ${uploadThingFiles.files.length} files in UploadThing`)

      // Create a map of filenames to file info for quick lookup
      const fileMap = new Map<string, any>()
      
      uploadThingFiles.files.forEach(file => {
        // Store both the exact filename and variations
        fileMap.set(file.name, file)
        fileMap.set(file.key, file)
        
        // Also store various filename patterns that might be in the database
        const decodedName = decodeURIComponent(file.name)
        const encodedName = encodeURIComponent(file.name)
        if (decodedName !== file.name) {
          fileMap.set(decodedName, file)
        }
        if (encodedName !== file.name) {
          fileMap.set(encodedName, file)
        }
      })

      // Process each user's document
      for (const user of usersWithDocuments) {
        try {
          if (!user.passportDocument?.filename) continue

          const dbFilename = user.passportDocument.filename
          let foundFile = null
          let isValid = false

          // First, check if we already have a valid URL
          if (user.passportDocument.url) {
            try {
              const response = await fetch(user.passportDocument.url, { method: 'HEAD' })
              if (response.ok) {
                isValid = true
                results.verified++
                continue
              }
            } catch (error) {
              // URL is invalid, continue to search by filename
            }
          }

          // Try to find the file in UploadThing by various name patterns
          foundFile = fileMap.get(dbFilename) || 
                     fileMap.get(decodeURIComponent(dbFilename)) ||
                     fileMap.get(encodeURIComponent(dbFilename))

          // If not found by exact match, try fuzzy matching for similar filenames
          if (!foundFile) {
            const normalizedDbName = dbFilename.toLowerCase().replace(/[^a-z0-9]/g, '')
            
            // Convert Map.entries() to Array to iterate
            const fileEntries = Array.from(fileMap.entries())
            
            for (const [filename, file] of fileEntries) {
              const normalizedFilename = filename.toLowerCase().replace(/[^a-z0-9]/g, '')
              
              // Check if filenames are similar (accounting for UploadThing's filename modifications)
              if (normalizedFilename === normalizedDbName || 
                  normalizedFilename.includes(normalizedDbName) ||
                  normalizedDbName.includes(normalizedFilename)) {
                foundFile = file
                break
              }
            }
          }

          if (foundFile) {
            // Construct the correct URL from the file key
            const v7Url = constructUploadThingUrl(foundFile.key)
            const legacyUrl = constructLegacyUrl(foundFile.key)
            
            // Test which URL works
            let workingUrl = null
            try {
              const v7Response = await fetch(v7Url, { method: 'HEAD' })
              if (v7Response.ok) {
                workingUrl = v7Url
              }
            } catch (error) {
              // v7 URL doesn't work, try legacy
            }
            
            if (!workingUrl) {
              try {
                const legacyResponse = await fetch(legacyUrl, { method: 'HEAD' })
                if (legacyResponse.ok) {
                  workingUrl = legacyUrl
                }
              } catch (error) {
                // Neither URL works
              }
            }
            
            if (workingUrl) {
              // Update the user with the correct URL from UploadThing
              await User.findByIdAndUpdate(user._id, {
                'passportDocument.url': workingUrl,
                'passportDocument.filename': foundFile.name // Update with actual filename
              })
              
              results.fixed++
              console.log(`Fixed document for user ${user.email}: ${dbFilename} -> ${foundFile.name}`)
            } else {
              // File found in API but URLs don't work
              results.missing++
              const errorInfo: DocumentError = {
                userId: user._id.toString(),
                email: user.email,
                filename: dbFilename,
                error: 'File found in UploadThing API but URLs are not accessible'
              }
              results.errors.push(errorInfo)
            }
          } else {
            // File not found in UploadThing
            results.missing++
            
            // Try to suggest similar filenames
            const suggestions: string[] = []
            const searchTerm = dbFilename.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 10)
            
            // Convert Map.entries() to Array to iterate
            const fileEntries = Array.from(fileMap.entries())
            
            for (const [filename] of fileEntries) {
              const normalizedFilename = filename.toLowerCase().replace(/[^a-z0-9]/g, '')
              if (normalizedFilename.includes(searchTerm) && suggestions.length < 3) {
                suggestions.push(filename)
              }
            }

            const errorInfo: DocumentError = {
              userId: user._id.toString(),
              email: user.email,
              filename: dbFilename,
              error: 'File not found in UploadThing',
              suggestions: suggestions.length > 0 ? suggestions : undefined
            }
            results.errors.push(errorInfo)
            
            console.log(`Document not found for user ${user.email}: ${dbFilename}`)
          }

        } catch (error: any) {
          const errorInfo: DocumentError = {
            userId: user._id.toString(),
            email: user.email,
            error: `Processing error: ${error.message}`
          }
          results.errors.push(errorInfo)
        }
      }

    } catch (utApiError: any) {
      console.error('UploadThing API error:', utApiError)
      return NextResponse.json(
        { 
          error: 'Failed to communicate with UploadThing API', 
          details: utApiError.message,
          suggestion: 'Please check your UPLOADTHING_TOKEN environment variable'
        },
        { status: 500 }
      )
    }

    console.log(`Verification complete: ${results.verified} verified, ${results.fixed} fixed, ${results.missing} missing`)

    return NextResponse.json({
      success: true,
      message: 'Document verification completed using UploadThing API',
      results
    })

  } catch (error: any) {
    console.error('Error verifying documents:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

// GET endpoint to check specific document using UploadThing API
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    await connectDB()

    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check if user is admin
    const adminUser = await User.findOne({ email: session.user.email })
    if (!adminUser || adminUser.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      )
    }

    const user = await User.findById(userId).select('passportDocument')
    
    if (!user || !user.passportDocument?.filename) {
      return NextResponse.json(
        { error: 'User or document not found' },
        { status: 404 }
      )
    }

    try {
      // Use UploadThing API to search for the file
      const utapi = new UTApi()
      const uploadThingFiles = await utapi.listFiles()
      
      const dbFilename = user.passportDocument.filename
      let foundFile = null
      
      // Search for the file in UploadThing
      for (const file of uploadThingFiles.files || []) {
        if (file.name === dbFilename || file.key === dbFilename) {
          foundFile = file
          break
        }
      }

      // Test current URL if exists
      const testResults = []
      if (user.passportDocument.url) {
        try {
          const response = await fetch(user.passportDocument.url, { method: 'HEAD' })
          testResults.push({
            url: user.passportDocument.url,
            status: response.status,
            exists: response.ok,
            source: 'database'
          })
        } catch (error: any) {
          testResults.push({
            url: user.passportDocument.url,
            status: 'error',
            exists: false,
            error: error.message,
            source: 'database'
          })
        }
      }

      // Add UploadThing API result
      if (foundFile) {
        const v7Url = constructUploadThingUrl(foundFile.key)
        const legacyUrl = constructLegacyUrl(foundFile.key)
        
        testResults.push({
          url: v7Url,
          status: 200,
          exists: true,
          source: 'uploadthing-api-v7',
          fileKey: foundFile.key,
          fileName: foundFile.name
        })
        
        testResults.push({
          url: legacyUrl,
          status: 200,
          exists: true,
          source: 'uploadthing-api-legacy',
          fileKey: foundFile.key,
          fileName: foundFile.name
        })
      } else {
        testResults.push({
          url: null,
          status: 404,
          exists: false,
          source: 'uploadthing-api',
          error: 'File not found in UploadThing'
        })
      }

      return NextResponse.json({
        success: true,
        document: {
          filename: user.passportDocument.filename,
          currentUrl: user.passportDocument.url,
          uploadedAt: user.passportDocument.uploadedAt
        },
        uploadThingResult: foundFile || null,
        testResults
      })

    } catch (utApiError: any) {
      return NextResponse.json(
        { 
          error: 'Failed to communicate with UploadThing API', 
          details: utApiError.message 
        },
        { status: 500 }
      )
    }

  } catch (error: any) {
    console.error('Error checking document:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}