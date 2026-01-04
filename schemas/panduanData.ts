import z from "zod";

interface iPanduanData {
    title: string;
    videoUrl: string;
    thumbnailUrl: string;
    steps: string[];
}

const zPanduanData = z.strictObject({
    title: z.string(),
    videoUrl: z.string(),
    thumbnailUrl: z.string(),
    steps: z.array(z.string()),
});

export { zPanduanData };
export type { iPanduanData };
