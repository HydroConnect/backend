import * as z from "zod";
const zDownloadRequest = z.strictObject({
    from: z.iso.datetime(),
    to: z.iso.datetime(),
    downloadId: z.string().max(parseInt(process.env.MAX_DOWNLOAD_ID_LENGTH)).min(1),
});
export { zDownloadRequest };
