type LogLevel = "info" | "warn" | "error";

type LogPayload = {
    event: string;
    message?: string;
    [key: string]: unknown;
};

const writeLog = (level: LogLevel, payload: LogPayload) => {
    const entry = {
        level,
        timestamp: new Date().toISOString(),
        ...payload
    };

    const line = JSON.stringify(entry);
    if (level === "error") {
        console.error(line);
        return;
    }

    console.log(line);
};

export const logger = {
    info: (payload: LogPayload) => writeLog("info", payload),
    warn: (payload: LogPayload) => writeLog("warn", payload),
    error: (payload: LogPayload) => writeLog("error", payload)
};
