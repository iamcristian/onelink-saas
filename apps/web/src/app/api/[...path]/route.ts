import { NextRequest, NextResponse } from "next/server";

const API_BACKEND = (
  process.env.API_INTERNAL_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://127.0.0.1:3001"
)
  .replace(/\/api\/?$/, "")
  .replace(/\/+$/, "");

const ALLOWED_ORIGINS = new Set([
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "https://onelink-saas.vercel.app",
  "https://onelink.bio",
]);

const extraOrigins = [
  process.env.NEXT_PUBLIC_APP_URL,
  process.env.FRONTEND_URL,
  process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null,
  process.env.NEXT_PUBLIC_VERCEL_URL ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}` : null,
].filter(Boolean) as string[];

extraOrigins.forEach((o) => ALLOWED_ORIGINS.add(o.replace(/\/+$/, "")));

function getValidatedOrigin(req: NextRequest, proto: string, host: string): string | null {
  const origin = req.headers.get("origin");
  const hostOrigin = `${proto}://${host}`;
  if (!origin || origin === hostOrigin) {
    return origin || hostOrigin;
  }
  if (ALLOWED_ORIGINS.has(origin) || origin.endsWith(".vercel.app")) {
    return origin;
  }
  if (
    process.env.NODE_ENV !== "production" &&
    /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)
  ) {
    return origin;
  }
  return null;
}

async function proxyRequest(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const pathString = path.join("/");
  const search = req.nextUrl.search;

  const host = req.headers.get("host") || "localhost:3000";
  const proto =
    req.headers.get("x-forwarded-proto") ||
    (req.nextUrl.protocol ? req.nextUrl.protocol.replace(":", "") : "http");

  const targetUrl = `${API_BACKEND}/api/${pathString}${search}`;

  // Build headers to forward
  const forwardHeaders = new Headers();
  req.headers.forEach((value, key) => {
    const lowerKey = key.toLowerCase();
    // Filter out host and connection headers
    if (!["host", "connection", "content-length"].includes(lowerKey)) {
      forwardHeaders.set(key, value);
    }
  });

  // Ensure origin is set so backend CORS check validates properly
  forwardHeaders.set("origin", "http://localhost:3000");
  forwardHeaders.set("x-forwarded-host", host);
  forwardHeaders.set("x-forwarded-proto", proto);

  let body: BodyInit | undefined;
  if (!["GET", "HEAD"].includes(req.method)) {
    try {
      body = await req.arrayBuffer();
    } catch {
      body = undefined;
    }
  }

  try {
    const backendRes = await fetch(targetUrl, {
      method: req.method,
      headers: forwardHeaders,
      body,
      redirect: "manual",
      // @ts-expect-error - duplex is required in node fetch when body is a stream
      duplex: "half",
    });

    const resHeaders = new Headers();
    backendRes.headers.forEach((value, key) => {
      const lowerKey = key.toLowerCase();
      if (!["content-encoding", "transfer-encoding", "content-length"].includes(lowerKey)) {
        resHeaders.set(key, value);
      }
    });

    // Provide strict, validated CORS headers
    const validOrigin = getValidatedOrigin(req, proto, host);
    if (validOrigin) {
      resHeaders.set("Access-Control-Allow-Origin", validOrigin);
      resHeaders.set("Access-Control-Allow-Credentials", "true");
      resHeaders.set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
      resHeaders.set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With, Accept");
    }

    // Rewrite redirects from backend so they never point to localhost on a mobile phone
    const location = resHeaders.get("location");
    if (location) {
      const clientBase = `${proto}://${host}`;
      const rewritten = location
        .replace(/https?:\/\/(localhost|127\.0\.0\.1):3001/gi, clientBase)
        .replace(/https?:\/\/(localhost|127\.0\.0\.1):3000/gi, clientBase);
      resHeaders.set("location", rewritten);
    }

    const resBuffer = await backendRes.arrayBuffer();
    return new NextResponse(resBuffer, {
      status: backendRes.status,
      statusText: backendRes.statusText,
      headers: resHeaders,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Backend unavailable";
    return NextResponse.json(
      { error: "API Proxy Error", message },
      { status: 502 }
    );
  }
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  return proxyRequest(req, ctx);
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  return proxyRequest(req, ctx);
}

export async function PUT(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  return proxyRequest(req, ctx);
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  return proxyRequest(req, ctx);
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  return proxyRequest(req, ctx);
}

export async function OPTIONS(req: NextRequest) {
  const host = req.headers.get("host") || "localhost:3000";
  const proto =
    req.headers.get("x-forwarded-proto") ||
    (req.nextUrl.protocol ? req.nextUrl.protocol.replace(":", "") : "http");
  const origin = getValidatedOrigin(req, proto, host);

  const headers: Record<string, string> = {
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With, Accept",
    "Access-Control-Max-Age": "86400",
  };

  if (origin) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers["Access-Control-Allow-Credentials"] = "true";
  }

  return new NextResponse(null, {
    status: 204,
    headers,
  });
}
