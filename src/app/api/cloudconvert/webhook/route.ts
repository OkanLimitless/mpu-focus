import { NextRequest, NextResponse } from 'next/server';

// Minimal webhook receiver: verifies secret (if provided) and returns 200.
// Optional: could trigger follow-up processing here if not polling.

export async function POST(request: NextRequest) {
  try {
    const signature = request.headers.get('CloudConvert-Signature');
    const secret = process.env.CLOUDCONVERT_WEBHOOK_SIGNING_SECRET;
    if (secret) {
      if (!signature || signature !== secret) {
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }
    }

    const payload = await request.json();
    console.log('CloudConvert webhook:', JSON.stringify(payload));

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Webhook error' }, { status: 500 });
  }
}

