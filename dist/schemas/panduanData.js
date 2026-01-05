import z from "zod";
const zPanduanData = z.strictObject({
    title: z.string(),
    videoUrl: z.string(),
    thumbnailUrl: z.string(),
    steps: z.array(z.string()),
});
export { zPanduanData };
