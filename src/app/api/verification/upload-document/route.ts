import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import User from '@/models/User'
import { UTApi } from 'uploadthing/server'

export async function POST(request: NextRequest) {
  try {
    await connectDB()

    const formData = await request.formData()
    const token = formData.get('token') as string
    const document = formData.get('document') as File

    if (!token || !document) {
      return NextResponse.json(
        { error: 'Token and document are required' },
        { status: 400 }
      )
    }

    // Find user with this verification token
    const user = await User.findOne({ verificationToken: token })
    
    if (!user) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 404 }
      )
    }

    if (user.verificationStatus === 'verified') {
      return NextResponse.json(
        { error: 'User is already verified' },
        { status: 400 }
      )
    }

    // Validate file type and size
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf']
    if (!allowedTypes.includes(document.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Please upload JPEG, PNG, or PDF files only.' },
        { status: 400 }
      )
    }

    if (document.size > 10 * 1024 * 1024) { // 10MB limit
      return NextResponse.json(
        { error: 'File size too large. Maximum size is 10MB.' },
        { status: 400 }
      )
    }

    try {
      // Upload to UploadThing
      const utapi = new UTApi()
      const uploadResult = await utapi.uploadFiles([document])
      
      if (!uploadResult[0] || uploadResult[0].error) {
        throw new Error('Upload failed')
      }

      const uploadedFile = uploadResult[0].data
      
      // Update user with document information
      user.passportDocument = {
        filename: uploadedFile.name,
        url: uploadedFile.url, // Store the URL for preview/download
        uploadedAt: new Date(),
        status: 'pending'
      }
      user.verificationStatus = 'documents_uploaded'
      await user.save()

      return NextResponse.json({
        success: true,
        message: 'Document uploaded successfully',
        file: {
          name: uploadedFile.name,
          url: uploadedFile.url
        }
      })

    } catch (uploadError) {
      console.error('Upload error:', uploadError)
      return NextResponse.json(
        { error: 'Failed to upload document. Please try again.' },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('Error uploading document:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}