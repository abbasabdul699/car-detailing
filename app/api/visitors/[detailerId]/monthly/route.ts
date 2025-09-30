import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Visitor from "@/app/models/Visitor";
import mongoose from "mongoose";
import { format, subMonths } from 'date-fns';

// POST: Record a new visit
export async function POST(req: Request) {
  await dbConnect();
  const { detailerId } = await req.json();
  if (!detailerId) return NextResponse.json({ error: "Missing detailerId" }, { status: 400 });

  await Visitor.create({ detailerId });
  return NextResponse.json({ success: true });
}

// GET: Return monthly visitor stats
export async function GET(req: Request, { params }: { params: Promise<{ detailerId: string }> }) {
  await dbConnect();
  
  const { detailerId } = await params;

  if (!detailerId) {
    return NextResponse.json({ error: "Detailer ID is required" }, { status: 400 });
  }

  // Aggregate by month
  const visitors = await Visitor.aggregate([
    { $match: { detailerId: detailerId } },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m", date: "$viewedAt", timezone: "UTC" } },
        count: { $sum: 1 }
      }
    },
    { $sort: { "_id": 1 } }
  ]);

  // Prepare last 6 months labels
  const now = new Date();
  const months = [];
  for (let i = 5; i >= 0; i--) {
    const d = subMonths(now, i);
    months.push({
      key: format(d, 'yyyy-MM'),
      label: format(d, 'MMM'),
    });
  }

  // Map visitors to months, filling in 0s
  const visitorsByMonth = months.map(m => {
    const found = visitors.find(v => v._id === m.key);
    return { month: m.label, visitors: found ? found.count : 0 };
  });

  return NextResponse.json({ visitors: visitorsByMonth });
}
