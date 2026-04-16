import crypto from "crypto";

type SessionPayload = {
    userId: string;
    exp: number;
};

const SESSION_TTL_MS = 1000 * 60 * 60 * 12;
const DEFAULT_DEV_SESSION_SECRET = "dev-session-secret-change-me";
const SESSION_SECRET = process.env.SESSION_SECRET || (
    process.env.NODE_ENV === "production" ? null : DEFAULT_DEV_SESSION_SECRET
);

if (!SESSION_SECRET) {
    throw new Error("SESSION_SECRET is required in production.");
}

const encode = (value: string) => Buffer.from(value, "utf8").toString("base64url");
const decode = (value: string) => Buffer.from(value, "base64url").toString("utf8");

const sign = (value: string) =>
    crypto.createHmac("sha256", SESSION_SECRET).update(value).digest("base64url");

export const createSessionToken = (userId: string) => {
    const payload: SessionPayload = {
        userId,
        exp: Date.now() + SESSION_TTL_MS
    };

    const encodedPayload = encode(JSON.stringify(payload));
    const signature = sign(encodedPayload);
    return `${encodedPayload}.${signature}`;
};

export const verifySessionToken = (token: string): SessionPayload | null => {
    const [encodedPayload, signature] = token.split(".");
    if (!encodedPayload || !signature) {
        return null;
    }

    const expectedSignature = sign(encodedPayload);
    const providedSignature = Buffer.from(signature, "utf8");
    const actualSignature = Buffer.from(expectedSignature, "utf8");

    if (providedSignature.length !== actualSignature.length) {
        return null;
    }

    if (!crypto.timingSafeEqual(providedSignature, actualSignature)) {
        return null;
    }

    try {
        const payload = JSON.parse(decode(encodedPayload)) as SessionPayload;
        if (!payload.userId || !payload.exp || payload.exp < Date.now()) {
            return null;
        }

        return payload;
    } catch {
        return null;
    }
};
