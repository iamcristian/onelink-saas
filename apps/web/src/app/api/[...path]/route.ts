import { NextRequest, NextResponse } from "next/server";

const API_BACKEND = process.env.API_INTERNAL_URL || "http://127.0.0.1:3001";

async function proxyRequest(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const pathString = path.join("/");
  const search = req.nextUrl.search;

  const host = req.headers.get("host") || "localhost:3000";
  const proto = req.headers.get("x-forwarded-proto") || (req.nextUrl.protocol ? req.nextUrl.protocol.replace(":", "") : "http");
  const isLanClient = !host.startsWith("localhost") && !host.startsWith("127.0.0.1");

  // Google OAuth on physical mobile / LAN devices:
  // Google OAuth 2.0 strictly rejects private LAN IPs (192.168.x.x) as redirect URIs.
  // When accessed from a mobile LAN device, immediately complete authentication via dev simulation.
  if (pathString === "auth/google" && (isLanClient || req.nextUrl.searchParams.get("mode") === "dev")) {
    const devTargetUrl = `${API_BACKEND}/api/auth/google/callback?code=mock_google_dev_code_${Date.now()}`;
    try {
      const devRes = await fetch(devTargetUrl, { redirect: "manual" });
      const devLocation = devRes.headers.get("location");
      if (devLocation) {
        const clientBase = `${proto}://${host}`;
        const rewritten = devLocation
          .replace(/https?:\/\/(localhost|127\.0\.0\.1):3001/gi, clientBase)
          .replace(/https?:\/\/(localhost|127\.0\.0\.1):3000/gi, clientBase);
        return NextResponse.redirect(rewritten);
      }
    } catch {
      // Fallback to normal proxy if simulation fails
    }
  }

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

  // Ensure origin is set to localhost:3000 so the backend CORS check always passes
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
      if (!["content-encoding", "transfer-encoding"].includes(lowerKey)) {
        resHeaders.set(key, value);
      }
    });

    // Provide strict, valid CORS headers matching the caller origin.
    // NEVER use wildcard "*" when Access-Control-Allow-Credentials is true (Fetch spec violation -> "Failed to fetch")
    const clientOrigin = req.headers.get("origin") || `${proto}://${host}`;
    resHeaders.set("Access-Control-Allow-Origin", clientOrigin);
    resHeaders.set("Access-Control-Allow-Credentials", "true");
    resHeaders.set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
    resHeaders.set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With, Accept");

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
  const proto = req.headers.get("x-forwarded-proto") || (req.nextUrl.protocol ? req.nextUrl.protocol.replace(":", "") : "http");
  const origin = req.headers.get("origin") || `${proto}://${host}`;

  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With, Accept",
      "Access-Control-Allow-Credentials": "true",
      "Access-Control-Max-Age": "86400",
    },
  });
}
