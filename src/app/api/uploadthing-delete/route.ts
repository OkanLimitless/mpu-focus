import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { fileKeys } = await request.json();

    if (!fileKeys || !Array.isArray(fileKeys) || fileKeys.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No file keys provided' },
        { status: 400 }
      );
    }

    // Import UploadThing server utilities
    const { UTApi } = await import('uploadthing/server');
    const utapi = new UTApi();

    // Delete files from UploadThing
    const deleteResult = await utapi.deleteFiles(fileKeys);
    
    let deletedCount = 0;
    const errors: string[] = [];

    // Handle the response format (can be different depending on UploadThing version)
    if (Array.isArray(deleteResult)) {
      // Array format: each item is { success: boolean, message?: string }
      deleteResult.forEach((result, index) => {
        if (result.success) {
          deletedCount++;
        } else {
          errors.push(`Failed to delete file ${fileKeys[index]}: ${result.message || 'Unknown error'}`);
        }
      });
    } else if (deleteResult && typeof deleteResult === 'object') {
      // Object format with deletedCount property
      deletedCount = deleteResult.deletedCount || 0;
      // Check if errors property exists (some versions may have it)
      const resultWithErrors = deleteResult as any;
      if (resultWithErrors.errors && Array.isArray(resultWithErrors.errors)) {
        errors.push(...resultWithErrors.errors);
      }
    }

    console.log(`UploadThing cleanup: Attempted to delete ${fileKeys.length} files, succeeded: ${deletedCount}, errors: ${errors.length}`);

    return NextResponse.json({
      success: deletedCount > 0,
      deletedCount,
      totalRequested: fileKeys.length,
      errors,
      message: `Successfully deleted ${deletedCount} out of ${fileKeys.length} files`
    });

  } catch (error) {
    console.error('UploadThing deletion error:', error);
    return NextResponse.json(
      { 
        success: false, 
        deletedCount: 0,
        totalRequested: 0,
        errors: [error instanceof Error ? error.message : 'Unknown deletion error'],
        message: 'File deletion failed'
      },
      { status: 500 }
    );
  }
}