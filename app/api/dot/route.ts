import { NextResponse } from 'next/server'

// 1x1 transparent PNG (68 bytes) base64
const DOT_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAAWgmWQ0AAAAASUVORK5CYII='

export async function GET() {
  const buffer = Buffer.from(DOT_BASE64, 'base64')
  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  })
}


