import { createUploadthing, type FileRouter } from "uploadthing/next";
import { UploadThingError } from "uploadthing/server";
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

const f = createUploadthing();

// File router for document processing
export const ourFileRouter = {
  pdfUploader: f({ pdf: { maxFileSize: "64MB" } })
    .middleware(async ({ req }) => {
      const session = await getServerSession(authOptions)
      if (!session?.user?.id) {
        throw new UploadThingError("Unauthorized")
      }

      return { uploadedBy: session.user.id, userEmail: session.user.email };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      // Validate mime type (defense in depth)
      const isPdf = (file.type || '').toLowerCase() === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
      if (!isPdf) {
        console.warn('Rejected non-PDF upload via server check:', file.name, file.type)
        throw new UploadThingError('Invalid file type; only PDF is allowed')
      }

      console.log("Upload complete for file:", file.name);
      console.log("File URL:", file.ufsUrl);
      
      return { uploadedBy: metadata.uploadedBy, fileUrl: file.ufsUrl };
    }),

  imageUploader: f({ 
    image: { 
      maxFileSize: "8MB", 
      maxFileCount: 200 // Allow up to 200 images for large documents
    } 
  })
    .middleware(async ({ req }) => {
      const session = await getServerSession(authOptions)
      if (!session?.user?.id) {
        throw new UploadThingError("Unauthorized")
      }
      return { uploadedBy: session.user.id, userEmail: session.user.email };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      // Log upload completion
      console.log("Image upload complete:", file.name, "URL:", file.ufsUrl);
      
      // Return the required data structure
      return { 
        uploadedBy: metadata.uploadedBy, 
        fileUrl: file.ufsUrl || file.url // Fallback for compatibility
      };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;