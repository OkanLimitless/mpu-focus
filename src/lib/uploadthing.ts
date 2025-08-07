import { createUploadthing, type FileRouter } from "uploadthing/next";
import { UploadThingError } from "uploadthing/server";

const f = createUploadthing();

// File router for document processing
export const ourFileRouter = {
  pdfUploader: f({ pdf: { maxFileSize: "100MB" } })
    .middleware(async ({ req }) => {
      // Optional: Add authentication here
      return { uploadedBy: "user" };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      // This runs after upload is complete
      console.log("Upload complete for file:", file.name);
      console.log("File URL:", file.url);
      
      // We can trigger processing here or return the URL
      return { uploadedBy: metadata.uploadedBy, fileUrl: file.url };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;