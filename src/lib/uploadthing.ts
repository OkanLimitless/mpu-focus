import { createUploadthing, type FileRouter } from "uploadthing/next";
import { UploadThingError } from "uploadthing/server";

const f = createUploadthing();

// File router for document processing
export const ourFileRouter = {
  pdfUploader: f({ pdf: { maxFileSize: "64MB" } })
    .middleware(async ({ req }) => {
      // Optional: Add authentication here
      return { uploadedBy: "user" };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      // This runs after upload is complete
      console.log("Upload complete for file:", file.name);
      console.log("File URL:", file.ufsUrl);
      
      // We can trigger processing here or return the URL
      return { uploadedBy: metadata.uploadedBy, fileUrl: file.ufsUrl };
    }),

  imageUploader: f({ 
    image: { 
      maxFileSize: "8MB", 
      maxFileCount: 200 // Allow up to 200 images for large documents
    } 
  })
    .middleware(async ({ req }) => {
      return { uploadedBy: "user" };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      console.log("Image upload complete:", file.name);
      return { uploadedBy: metadata.uploadedBy, fileUrl: file.ufsUrl };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;