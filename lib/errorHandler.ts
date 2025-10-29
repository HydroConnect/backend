import type { NextFunction, Request, Response } from "express";
import { STATUS_CODES } from "http";

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

    res.status((err as HttpError).status).json(`${err.message}\nPossible cause: ${err.cause}`);

    return;
}

export function IOErrorHandler(err: any) {
    // Possible Error: ZODError
    //                 ReadingsError (MongoDB)
    console.log(err);
}
