import { type NextRequest, NextResponse } from "next/server";
import { auth } from "~/lib/auth";
import { polarSDK } from "~/lib/polar";

const CREDITS_BY_PRODUCT: Record<string, number> = {
  "b1a37096-0af7-4c9d-be68-d021df848a22": 30,
  "17a39420-9694-441a-b90a-35a76b452e51": 100,
  "377947ea-1265-42d1-bf11-70921c7f58d2": 300,
};

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as { productId?: string };
  const { productId } = body;

  if (!productId || !(productId in CREDITS_BY_PRODUCT)) {
    return NextResponse.json({ error: "Invalid product" }, { status: 400 });
  }

  const credits = CREDITS_BY_PRODUCT[productId];
  const baseUrl = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";
  const successUrl = `${baseUrl}/payment/success?source=mobile&credits=${credits}`;

  const checkout = await polarSDK.checkouts.create({
    products: [productId],
    successUrl,
    customerEmail: session.user.email,
  });

  return NextResponse.json({ url: checkout.url });
}
