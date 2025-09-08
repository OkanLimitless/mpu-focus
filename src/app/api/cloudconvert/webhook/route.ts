import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

// Verify CloudConvert webhook via HMAC SHA256 of raw body using CLOUDCONVERT_WEBHOOK_SIGNING_SECRET.
function verifySignature(rawBody: string, header: string | null, secret: string): boolean {
  if (!header) return false;
  const digest = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  // Accept exact match or v1=... format
  const normalized = header.trim().toLowerCase();
  if (normalized === digest) return true;
  const v1Match = normalized.match(/v1=([a-f0-9]{64})/);
  if (v1Match && v1Match[1] === digest) return true;
  return false;
}

export async function POST(request: NextRequest) {
  try {
    const secret = process.env.CLOUDCONVERT_WEBHOOK_SIGNING_SECRET;
    const raw = await request.text();
    if (secret) {
      const signature = request.headers.get('CloudConvert-Signature');
      const valid = verifySignature(raw, signature, secret);
      if (!valid) {
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }
    }

    // Safe to parse now
    const payload = JSON.parse(raw);
    console.log('CloudConvert webhook:', JSON.stringify(payload));

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Webhook error' }, { status: 500 });
  }
}

