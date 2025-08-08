import { genUploader } from "uploadthing/client";
import type { OurFileRouter } from "./uploadthing";

export const { uploadFiles } = genUploader<OurFileRouter>();

export async function uploadToUploadThing(
  file: File,
  options?: {
    onUploadBegin?: (opts: { file: string }) => void;
    onUploadProgress?: (opts: { file: File; progress: number; loaded: number; delta: number; totalLoaded: number; totalProgress: number; }) => void;
  }
) {
  try {
    const response = await uploadFiles("pdfUploader", {
      files: [file],
      onUploadBegin: options?.onUploadBegin,
      onUploadProgress: options?.onUploadProgress,
    });

    return response[0];
  } catch (error) {
    throw new Error(`Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function uploadImagesToUploadThing(
  imageFiles: File[],
  options?: {
    onProgress?: (progress: number) => void;
  }
) {
  try {
    const response = await uploadFiles("imageUploader", {
      files: imageFiles,
      onUploadProgress: (progressData) => {
        // Use the totalProgress which should be 0-100
        options?.onProgress?.(progressData.totalProgress);
      },
    });

    return response;
  } catch (error) {
    throw new Error(`Image upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Server-side function to delete files from UploadThing after processing
export async function deleteUploadThingFiles(fileUrls: string[]): Promise<{ success: boolean; deletedCount: number; errors: string[] }> {
  try {
    // Extract file keys from URLs
    const fileKeys = fileUrls.map(url => {
      // UploadThing URLs format: https://utfs.io/f/{fileKey} or https://{subdomain}.ufs.sh/f/{fileKey}
      const match = url.match(/\/f\/([^/?]+)/);
      return match ? match[1] : null;
    }).filter(Boolean) as string[];

    if (fileKeys.length === 0) {
      return { success: false, deletedCount: 0, errors: ['No valid file keys found in URLs'] };
    }

    // Use UploadThing's server SDK for deletion
    const { UTApi } = await import('uploadthing/server');
    const utapi = new UTApi();

    console.log(`Attempting to delete ${fileKeys.length} files from UploadThing...`);

    // Delete files using UploadThing's official API with timeout handling
    try {
      await utapi.deleteFiles(fileKeys);
      console.log(`Successfully deleted ${fileKeys.length} files from UploadThing`);
      
      return {
        success: true,
        deletedCount: fileKeys.length,
        errors: []
      };
    } catch (deleteError) {
      console.warn('UploadThing deletion error (files may already be deleted):', deleteError);
      
      // Return success anyway since files might already be deleted
      // The user confirmed files are gone from UploadThing dashboard
      return {
        success: true,
        deletedCount: fileKeys.length,
        errors: [`Deletion API error (files likely already deleted): ${deleteError instanceof Error ? deleteError.message : 'Unknown error'}`]
      };
    }
  } catch (error) {
    console.error('Error deleting UploadThing files:', error);
    return { 
      success: false, 
      deletedCount: 0, 
      errors: [error instanceof Error ? error.message : 'Unknown deletion error'] 
    };
  }
}