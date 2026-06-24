import { createUploadthing, type FileRouter } from "uploadthing/next";

const f = createUploadthing();

export const ourFileRouter = {
  mediaUploader: f({
    image: { maxFileSize: "8MB", maxFileCount: 20 },
    video: { maxFileSize: "32MB", maxFileCount: 1 }
  })
  .onUploadComplete(async ({ metadata, file }) => {
    return { url: file.url, type: file.type.startsWith("video") ? "video" : "image" };
  }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;