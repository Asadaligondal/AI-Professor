import { generateReactHelpers } from "@uploadthing/react";
import type { OurFileRouter } from "@/app/api/uploadthing/core";

// Generate typed React helpers for client-side uploads
// useUploadThing gives a programmatic `startUpload(files)` function
export const { useUploadThing } = generateReactHelpers<OurFileRouter>();
