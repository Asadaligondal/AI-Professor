import { createRouteHandler } from "uploadthing/next";
import { ourFileRouter } from "./core";

// Create the Next.js App Router handler for UploadThing
// This handles both GET (config) and POST (upload) requests
export const { GET, POST } = createRouteHandler({ router: ourFileRouter });
