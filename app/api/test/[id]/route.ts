import { NextResponse } from 'next/server';
export async function DELETE(request: Request, contextPromise: Promise<{ params: { id: string } }>) {
  const { params } = await contextPromise;
  return NextResponse.json({ id: params.id });
}
