import { readingsModel } from "../schemas/models/readings.js";
import { filterMongo } from "./filterMongo.js";
export async function sendDownload(socket, downloadRequest) {
    const readings = await readingsModel
        .find({
        timestamp: {
            $gte: new Date(downloadRequest.from),
            $lte: new Date(downloadRequest.to),
        },
    })
        .limit(parseInt(process.env.DOWNLOAD_CHUNK_N_SIZE));
    if (readings.length === 0) {
        socket.emit("download-finish", downloadRequest.downloadId);
        return;
    }
    socket.emit("download-data", filterMongo(readings), downloadRequest.downloadId, () => {
        // This is for acknowledgement to continue sending
        setTimeout(() => {
            sendDownload(socket, {
                from: new Date(readings[readings.length - 1].timestamp.getTime() + 1).toISOString(),
                to: downloadRequest.to,
                downloadId: downloadRequest.downloadId,
            });
        }, 1000);
    });
}
