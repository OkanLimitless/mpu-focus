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