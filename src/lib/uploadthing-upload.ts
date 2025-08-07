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