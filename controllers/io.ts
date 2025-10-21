import { type Server as HttpServer } from "http";
import { Server, Socket } from "socket.io";
import { readingsModel, zReadings } from "../models/readings.js";
import { chemFormula } from "../lib/chemFormula.js";

export function initSocketIO(server: HttpServer) {
    const io = new Server(server);

    io.of("/io/v1").on("connection", (socket: Socket) => {
        socket.on("post-readings", (data) => {
            try {
                // Initialize empty field to match schema
                data.percent = 0;
                data.timestamp = new Date(Date.now()).toISOString();

                data = zReadings.parse(data);
                data.percent = chemFormula(data);
                socket.broadcast.emit("readings", data);

                new readingsModel(data).save().catch((err) => {
                    console.log(
                        "Failed to save to Database!\n-------\nData: ",
                        data,
                        "\n\n-----\n\nErr: ",
                        err
                    );
                });
            } catch (err) {
                console.log("Invalid Data!\n-------------\n", err);
            }
        });
    });
}
