import type { Socket } from "socket.io";
import type { iDownloadRequest } from "../schemas/downloadRequest.js";
import { readingsModel } from "../schemas/models/readings.js";
import { filterMongo } from "./filterMongo.js";
import { IOErrorHandler } from "./errorHandler.js";

export async function sendDownload(
    socket: Socket,
    downloadRequest: iDownloadRequest
): Promise<void> {
    try {
        const readings = await readingsModel
            .find({
                timestamp: {
                    $gte: new Date(downloadRequest.from),
                    $lte: new Date(downloadRequest.to),
                },
            })
            .limit(parseInt(process.env.DOWNLOAD_CHUNK_N_SIZE!));

        if (readings.length === 0) {
            socket.emit("download-finish", downloadRequest.downloadId);
            return;
        }

        socket.emit("download-data", filterMongo(readings), downloadRequest.downloadId, () => {
            // This callback is for acknowledgement to continue sending

            const nextCall = () => {
                sendDownload(socket, {
                    from: new Date(
                        readings[readings.length - 1]!.timestamp.getTime() + 1
                    ).toISOString(),
                    to: downloadRequest.to,
                    downloadId: downloadRequest.downloadId,
                });
            };

            if (process.env.NODE_ENV === "development") {
                setTimeout(nextCall, 1000);
            } else {
                nextCall();
            }
        });
    } catch (err) {
        IOErrorHandler(err);
    }
}
