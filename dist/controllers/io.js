import {} from "http";
import { Server, Socket } from "socket.io";
import { zDownloadRequest } from "../schemas/downloadRequest.js";
import { sendDownload } from "../lib/sendDownload.js";
import { IOError, IOErrorEnum, IOErrorHandler } from "../lib/errorHandler.js";
let io;
export function getIO() {
    return io;
}
const tracker = {};
export function initSocketIO(server) {
    io = new Server(server);
    io.of("/io/v1").on("connection", (socket) => {
        socket.on("disconnect", () => {
            tracker[socket.handshake.address] = undefined;
            delete tracker[socket.handshake.address];
        });
        socket.on("download-request", (downloadRequest) => {
            try {
                const lst = tracker[socket.handshake.address];
                if (lst !== undefined &&
                    Date.now() - lst <= 1000 * parseInt(process.env.MIN_DOWNLOAD_INTERVAL_SECONDS)) {
                    throw new IOError(IOErrorEnum.TooManyDownloads);
                }
                else {
                    tracker[socket.handshake.address] = Date.now();
                }
                downloadRequest = zDownloadRequest.parse(downloadRequest);
                sendDownload(socket, downloadRequest);
            }
            catch (err) {
                IOErrorHandler(err, socket);
            }
        });
    });
}
