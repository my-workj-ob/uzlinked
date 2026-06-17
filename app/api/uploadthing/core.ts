import { createUploadthing, type FileRouter } from "uploadthing/next";

const f = createUploadthing();

export const ourFileRouter = {
  mediaUploader: f({
    image: { maxFileSize: "4MB", maxFileCount: 1 },
    video: { maxFileSize: "16MB", maxFileCount: 1 }
  })
  .onUploadComplete(async ({ metadata, file }) => {
    return { url: file.url, type: file.type.startsWith("video") ? "video" : "image" };
  }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;