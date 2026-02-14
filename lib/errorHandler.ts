import type { NextFunction, Request, Response } from "express";
import { STATUS_CODES } from "http";
import type { Socket } from "socket.io";
import { ZodError } from "zod";
import { consoleLogger } from "./logger.js";

export enum IOErrorEnum {
    TooManyDownloads,
}
export class IOError extends Error {
    constructor(type: IOErrorEnum) {
        let message = "";
        switch (type) {
            case IOErrorEnum.TooManyDownloads:
                message = `Client sent too many downloads, wait ${process.env.MIN_DOWNLOAD_INTERVAL_SECONDS}s`;
                break;
        }
        super(message);
        Error.captureStackTrace(this, this.constructor);
        this.name = this.constructor.name;
    }
}
export class HttpError extends Error {
    status: number;

    constructor(statusCode: number) {
        super(STATUS_CODES[statusCode]);
        this.name = this.constructor.name;
        this.status = statusCode;
        Error.captureStackTrace(this, this.constructor);

        switch (Math.floor(statusCode / 100)) {
            case 4:
                this.cause = "Bad Request / Connection Error";
                break;
            case 5:
                this.cause = "Server Error";
                break;
            default:
                this.cause = STATUS_CODES[statusCode];
                break;
        }
    }
}

export function RESTErrorHandler(err: Error, req: Request, res: Response, next: NextFunction) {
    if (res.headersSent) {
        return next(err);
    }

    if (!(err instanceof HttpError)) {
        if (err instanceof SyntaxError) {
            err = new HttpError(400);
        } else {
            err = new HttpError(500);
        }
    }
    if (process.env.NODE_ENV !== "production") {
        consoleLogger.error(err);
    }

    res.status((err as HttpError).status).json(`${err.message}\nPossible cause: ${err.cause}`);

    return;
}

export function IOErrorHandler(err: Error, socket: Socket) {
    // Possible Error: ZODError
    //                 ReadingsError (MongoDB)
    if (!(err instanceof IOError)) {
        if (err instanceof ZodError) {
            err.cause = "Invalid Request Body";
        } else {
            err.name = "Server Error";
            err.message = "Server Error";
            err.cause = "Server Error";
        }
    }
    if (process.env.NODE_ENV !== "production") {
        consoleLogger.error(err);
    }

    socket.emit("error", {
        name: err.name,
        message: err.message,
        cause: err.cause,
        stack: undefined,
    });
}
