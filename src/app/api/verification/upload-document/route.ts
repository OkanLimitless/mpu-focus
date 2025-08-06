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
        status: 'pending',
        // Preserve resubmission tracking
        resubmissionCount: user.passportDocument?.resubmissionCount || 0,
        allowResubmission: false, // Reset until admin decides
        // Clear previous rejection reason
        rejectionReason: undefined
      }

      // Update verification status based on whether contract was already signed
      if (isResubmission && user.contractSigned) {
        // User is resubmitting documents but contract is already signed
        user.verificationStatus = 'contract_signed'
      } else {
        // First time upload or no contract signed yet
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
        nextStep: user.contractSigned ? 'review' : 'contract_signing'
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