import { createUploadthing, type FileRouter } from "uploadthing/server";

const f = createUploadthing();

// Two endpoints: answer key (single PDF) and student paper (up to 4 PDFs)
export const ourFileRouter = {
  answerKey: f({ pdf: { maxFileSize: "64MB", maxFileCount: 1 } })
    .onUploadComplete(({ file }) => {
      console.log("[UploadThing] answerKey upload complete:", file.url);
      return { url: file.url, name: file.name, size: file.size, key: file.key };
    }),

  studentPaper: f({ pdf: { maxFileSize: "64MB", maxFileCount: 4 } })
    .onUploadComplete(({ file }) => {
      console.log("[UploadThing] studentPaper upload complete:", file.url);
      return { url: file.url, name: file.name, size: file.size, key: file.key };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
