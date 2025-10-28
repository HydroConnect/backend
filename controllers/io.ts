import { type Server as HttpServer } from "http";
import { Server, Socket, type DefaultEventsMap } from "socket.io";
import { zDownloadRequest } from "../schemas/downloadRequest.js";
import { sendDownload } from "../lib/sendDownload.js";
import { IOErrorHandler } from "../lib/errorHandler.js";

let io: Server<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>;

export function getIO() {
    return io;
}

export function initSocketIO(server: HttpServer) {
    io = new Server(server);

    io.of("/io/v1").on("connection", (socket: Socket) => {
        socket.on("download-request", (downloadRequest) => {
            try {
                downloadRequest = zDownloadRequest.parse(downloadRequest);
                sendDownload(socket, downloadRequest);
            } catch (err) {
                IOErrorHandler(err);
            }
        });
    });
}
