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

    // Check if user is already verified
    if (user.verificationStatus === 'verified') {
      return NextResponse.json(
        { error: 'User is already verified' },
        { status: 400 }
      )
    }

    // Check if this is a resubmission scenario
    const isResubmission = user.verificationStatus === 'resubmission_required' && 
                          user.passportDocument?.allowResubmission

    // For new uploads, user should be in pending status
    // For resubmissions, user should be in resubmission_required status
    if (!isResubmission && user.verificationStatus !== 'pending') {
      return NextResponse.json(
        { error: 'Documents can only be uploaded when verification is pending or resubmission is required' },
        { status: 400 }
      )
    }

    // Validate file type and size
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp', 'application/pdf']
    if (!allowedTypes.includes(document.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Please upload JPEG, PNG, WEBP, or PDF files only.' },
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
      // Upload to UploadThing v7
      const utapi = new UTApi()
      const uploadResult = await utapi.uploadFiles([document])
      
      // In v7, the response structure has changed
      if (!uploadResult[0] || uploadResult[0].error) {
        throw new Error(uploadResult[0]?.error?.message || 'Upload failed')
      }

      const uploadedFile = uploadResult[0].data
      
      // Update user with document information - store both filename and URL
      user.passportDocument = {
        filename: uploadedFile.name,
        url: uploadedFile.url, // Store the full URL from UploadThing
        uploadedAt: new Date(),
        status: 'pending',
        resubmissionCount: user.passportDocument?.resubmissionCount || 0,
        allowResubmission: false, // Reset until admin decides
        rejectionReason: undefined
      }

      // If this is a resubmission and user has already signed contract, set them directly to contract_signed
      if (isResubmission && user.contractSigned?.signedAt) {
        user.verificationStatus = 'contract_signed'
      } else {
        user.verificationStatus = 'documents_uploaded'
      }

      await user.save()

      const responseMessage = isResubmission 
        ? 'Document resubmitted successfully. Your previous contract signature remains valid.'
        : 'Document uploaded successfully'

      return NextResponse.json({
        success: true,
        message: responseMessage,
        file: {
          name: uploadedFile.name,
          url: uploadedFile.url
        },
        isResubmission: isResubmission,
        nextStep: user.contractSigned?.signedAt ? 'review' : 'contract_signing'
      })

    } catch (uploadError: any) {
      console.error('Upload error:', uploadError)
      return NextResponse.json(
        { error: 'Failed to upload document: ' + uploadError.message },
        { status: 500 }
      )
    }

  } catch (error: any) {
    console.error('Upload document error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}