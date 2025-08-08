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

    // Make request to our deletion API (use absolute URL for server-side calls)
    const baseUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 
                   process.env.NODE_ENV === 'production' ? 'https://mpu-focus.vercel.app' : 
                   'http://localhost:3000';
    const response = await fetch(`${baseUrl}/api/uploadthing-delete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ fileKeys }),
    });

    if (!response.ok) {
      throw new Error(`Deletion request failed: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error deleting UploadThing files:', error);
    return { 
      success: false, 
      deletedCount: 0, 
      errors: [error instanceof Error ? error.message : 'Unknown deletion error'] 
    };
  }
}