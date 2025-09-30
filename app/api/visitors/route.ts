import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Visitor from "@/app/models/Visitor";

// POST: Record a new visit
export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const { detailerId } = await req.json();
    
    if (!detailerId) {
      return NextResponse.json({ error: "Missing detailerId" }, { status: 400 });
    }

    await Visitor.create({ detailerId, viewedAt: new Date() });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error recording visitor:', error);
    return NextResponse.json({ error: 'Failed to record visit' }, { status: 500 });
  }
}
