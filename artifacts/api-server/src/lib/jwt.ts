import { createHmac, timingSafeEqual, randomBytes } from "crypto";

function getSecret(): string {
  if (process.env.JWT_SECRET) {
    return process.env.JWT_SECRET;
  }

  if (process.env.NODE_ENV !== "production") {
    return "agency_os_default_dev_secret_key_1234567890_abc";
  }

  throw new Error(
    "JWT_SECRET environment variable is required in production."
  );
}

const EXPIRY_SECONDS = 60 * 60 * 24 * 7; // 7 days

function base64url(input: string): string {
  return Buffer.from(input).toString("base64url");
}

function decodeBase64url(input: string): string {
  return Buffer.from(input, "base64url").toString("utf8");
}

interface JwtPayload {
  sub: string;
  iat: number;
  exp: number;
}

export function signToken(userId: string): string {
  const secret = getSecret();
  const header = base64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const now = Math.floor(Date.now() / 1000);
  const payload = base64url(
    JSON.stringify({ sub: userId, iat: now, exp: now + EXPIRY_SECONDS })
  );
  const signature = createHmac("sha256", secret)
    .update(`${header}.${payload}`)
    .digest("base64url");
  return `${header}.${payload}.${signature}`;
}

export function verifyToken(token: string): JwtPayload {
  const secret = getSecret();
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("Invalid token structure");

  const [header, payload, signature] = parts as [string, string, string];
  const expected = createHmac("sha256", secret)
    .update(`${header}.${payload}`)
    .digest("base64url");

  const sigBuf = Buffer.from(signature, "base64url");
  const expBuf = Buffer.from(expected, "base64url");
  if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
    throw new Error("Invalid signature");
  }

  const data = JSON.parse(decodeBase64url(payload)) as JwtPayload;
  if (data.exp < Math.floor(Date.now() / 1000)) {
    throw new Error("Token expired");
  }
  return data;
}
