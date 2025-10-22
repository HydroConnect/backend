import * as z from "zod";

interface iDownloadRequest {
    from: string;
    to: string;
    downloadId: String;
}

const zDownloadRequest = z.strictObject({
    from: z.iso.datetime(),
    to: z.iso.datetime(),
    downloadId: z.string().max(parseInt(process.env.MAX_DOWNLOAD_ID_LENGTH!)).min(1),
});

export { zDownloadRequest };
export type { iDownloadRequest };
