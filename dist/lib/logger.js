import winston from "winston";
const myFormat = winston.format.combine(winston.format.timestamp(), winston.format.printf(({ timestamp, message, level }) => {
    return `${timestamp} ${level}: ${message}`;
}));
export const logger = winston.createLogger({
    level: "info",
    exitOnError: false,
    format: myFormat,
    transports: [new winston.transports.File({ filename: "log" })],
});
if (process.env.NODE_ENV !== "production") {
    logger.add(new winston.transports.Console());
}
export const consoleLogger = winston.createLogger({
    level: "info",
    exitOnError: false,
    format: myFormat,
    transports: [
        new winston.transports.File({ filename: "log" }),
        new winston.transports.Console(),
    ],
});
