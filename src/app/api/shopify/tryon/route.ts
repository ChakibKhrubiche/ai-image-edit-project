import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { db } from '~/server/db';
import { env } from '~/env';
import { SHOPIFY_PLANS } from '~/lib/shopify-plans';
import type { ShopifyPlanKey } from '~/lib/shopify-plans';

export const runtime = 'nodejs';
export const maxDuration = 300;

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Shop-Domain',
};

const MODERATION_PROMPT = `You are a strict content moderation system for a hijab virtual try-on app.
Respond ONLY with JSON: {"safe": true} or {"safe": false, "reason": "brief reason"}
BLOCK only if the image clearly shows nudity, explicit content, or pornographic material.
When in doubt → mark as SAFE.`;

interface WaveSpeedInitialResponse {
  code: number;
  message: string;
  data: {
    id: string;
    urls: { get: string };
    status: string;
    error?: string;
  };
}

interface WaveSpeedResultResponse {
  code: number;
  data: {
    outputs: string[];
    status: string;
    error?: string;
  };
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function pollForResult(resultUrl: string, apiKey: string): Promise<string> {
  for (let attempt = 1; attempt <= 60; attempt++) {
    const res = await fetch(resultUrl, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!res.ok) throw new Error(`Poll failed: ${res.status}`);

    const data = (await res.json()) as WaveSpeedResultResponse;

    if (data.data.status === 'succeeded' || data.data.status === 'completed') {
      const url = data.data.outputs[0];
      if (!url) throw new Error('No output URL in response');
      return url;
    }
    if (data.data.status === 'failed') {
      throw new Error(data.data.error ?? 'Generation failed');
    }
    if (attempt < 60) await sleep(5000);
  }
  throw new Error('Timeout: image generation took too long');
}

async function fetchImageAsBase64(url: string): Promise<string> {
  // Handle protocol-relative URLs (e.g. //cdn.shopify.com/...)
  const absoluteUrl = url.startsWith('//') ? `https:${url}` : url;
  const res = await fetch(absoluteUrl);
  if (!res.ok) throw new Error(`Failed to fetch image: ${res.status}`);
  const buffer = await res.arrayBuffer();
  const mime = res.headers.get('content-type') ?? 'image/jpeg';
  const base64 = Buffer.from(buffer).toString('base64');
  return `data:${mime};base64,${base64}`;
}

// CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function POST(request: NextRequest) {
  const shopDomain = request.headers.get('X-Shop-Domain');

  if (!shopDomain) {
    return NextResponse.json(
      { error: 'Missing X-Shop-Domain header' },
      { status: 400, headers: CORS_HEADERS },
    );
  }

  // 1. Verify store is active
  const store = await db.shopifyStore.findUnique({ where: { shop: shopDomain } });
  if (!store?.isActive) {
    return NextResponse.json(
      { error: 'Store not found or inactive' },
      { status: 403, headers: CORS_HEADERS },
    );
  }

  // 2. Check monthly quota
  const plan = SHOPIFY_PLANS[store.plan as ShopifyPlanKey];
  if (plan.tryonsPerMonth !== Infinity) {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const usageThisMonth = await db.shopifyTryonUsage.count({
      where: { storeId: store.id, createdAt: { gte: startOfMonth } },
    });

    if (usageThisMonth >= plan.tryonsPerMonth) {
      return NextResponse.json(
        { error: `Quota mensuel atteint (${plan.tryonsPerMonth} try-ons — plan ${plan.label})` },
        { status: 429, headers: CORS_HEADERS },
      );
    }
  }

  // 3. Parse body
  const body = (await request.json()) as {
    customerPhoto?: string;
    productImageUrl?: string;
    productId?: string;
  };

  const { customerPhoto, productImageUrl, productId = 'unknown' } = body;

  if (!customerPhoto || !productImageUrl) {
    return NextResponse.json(
      { error: 'customerPhoto and productImageUrl are required' },
      { status: 400, headers: CORS_HEADERS },
    );
  }

  // 4. Moderate the customer photo
  const matches = /^data:(.+);base64,(.+)$/.exec(customerPhoto);
  if (matches) {
    const mediaType = matches[1] as 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif';
    const base64Data = matches[2]!;
    try {
      const modResult = await anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 100,
        system: MODERATION_PROMPT,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64Data } },
            { type: 'text', text: 'Analyze this image for inappropriate content.' },
          ],
        }],
      });
      const textBlock = modResult.content.find(c => c.type === 'text');
      const raw = textBlock?.type === 'text' ? textBlock.text : '{"safe":true}';
      const parsed = JSON.parse(raw.replace(/```json|```/g, '').trim()) as { safe: boolean };
      if (!parsed.safe) {
        return NextResponse.json(
          { error: 'Image non conforme à notre politique de modération' },
          { status: 400, headers: CORS_HEADERS },
        );
      }
    } catch {
      // Moderation error → fail open (allow through)
    }
  }

  // 5. Fetch product image and convert to base64
  let productImageBase64: string;
  try {
    productImageBase64 = await fetchImageAsBase64(productImageUrl);
  } catch (error) {
    return NextResponse.json(
      { error: `Impossible de charger l'image produit: ${error instanceof Error ? error.message : 'unknown'}` },
      { status: 400, headers: CORS_HEADERS },
    );
  }

  // 6. Call WaveSpeed
  const apiKey = env.WAVESPEED_API_KEY;
  const prompt = env.WAVESPEED_PROMPT ?? '';
  const lora = env.WAVESPEED_LORA ?? '';
  const scale = env.WAVESPEED_SCALE ?? 1;

  try {
    const wavespeedRes = await fetch(
      'https://api.wavespeed.ai/api/v3/wavespeed-ai/qwen-image/edit-2511-lora',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          enable_base64_output: false,
          enable_sync_mode: false,
          images: [customerPhoto, productImageBase64],
          loras: [{ path: lora, scale }],
          output_format: 'jpeg',
          prompt,
          seed: -1,
        }),
      },
    );

    if (!wavespeedRes.ok) {
      throw new Error(`WaveSpeed error: ${wavespeedRes.status}`);
    }

    const initial = (await wavespeedRes.json()) as WaveSpeedInitialResponse;
    if (initial.code !== 200) {
      throw new Error(initial.message ?? 'WaveSpeed task creation failed');
    }

    const imageUrl = await pollForResult(initial.data.urls.get, apiKey);

    // 7. Record usage
    await db.shopifyTryonUsage.create({
      data: { storeId: store.id, productId },
    });

    return NextResponse.json({ success: true, imageUrl }, { headers: CORS_HEADERS });

  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Generation failed' },
      { status: 500, headers: CORS_HEADERS },
    );
  }
}
