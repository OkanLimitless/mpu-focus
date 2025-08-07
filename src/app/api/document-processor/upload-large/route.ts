import { NextRequest, NextResponse } from 'next/server';
import { UTApi } from 'uploadthing/server';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }
    
    // Validate file type
    if (!file.name.endsWith('.pdf')) {
      return NextResponse.json(
        { error: 'Only PDF files are allowed' },
        { status: 400 }
      );
    }
    
    // Upload to UploadThing
    const utapi = new UTApi();
    const uploadResult = await utapi.uploadFiles([file]);
    
    if (!uploadResult || uploadResult.length === 0 || uploadResult[0].error) {
      throw new Error('Upload failed: ' + (uploadResult[0]?.error?.message || 'Unknown error'));
    }
    
    const uploadedFile = uploadResult[0].data;
    
    return NextResponse.json({
      success: true,
      fileUrl: uploadedFile.url,
      fileKey: uploadedFile.key,
      fileName: uploadedFile.name,
      fileSize: uploadedFile.size
    });
    
  } catch (error) {
    console.error('Large file upload error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Upload failed' },
      { status: 500 }
    );
  }
}