import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

// GET /api/shopify/tryon/proxy?url=<encoded-image-url>
// Proxies an external image through our domain so the widget can draw it
// on a canvas (required for watermark — avoids cross-origin canvas taint).
export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url).searchParams.get('url');
  if (!url) {
    return new NextResponse('Missing url param', { status: 400 });
  }

  // Only allow https URLs pointing to known image CDNs
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return new NextResponse('Invalid url', { status: 400 });
  }

  if (parsed.protocol !== 'https:') {
    return new NextResponse('Only https allowed', { status: 400 });
  }

  let res: Response;
  try {
    res = await fetch(url, { headers: { Accept: 'image/*' } });
  } catch {
    return new NextResponse('Failed to fetch image', { status: 502 });
  }

  if (!res.ok) {
    return new NextResponse('Upstream error', { status: 502 });
  }

  const contentType = res.headers.get('content-type') ?? 'image/jpeg';
  if (!contentType.startsWith('image/')) {
    return new NextResponse('Not an image', { status: 400 });
  }

  const body = await res.arrayBuffer();

  return new NextResponse(body, {
    headers: {
      ...CORS_HEADERS,
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=3600, immutable',
    },
  });
}
