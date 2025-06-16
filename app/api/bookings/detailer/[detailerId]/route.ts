import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request, { params }: { params: { detailerId: string } }) {
  const { detailerId } = params;
  const url = new URL(req.url);
  const month = url.searchParams.get("month"); // e.g. "2025-06"

  // Get bookings for this detailer in the given month
  const bookings = await prisma.booking.findMany({
    where: {
      detailerId,
      date: {
        gte: new Date(`${month}-01T00:00:00.000Z`),
        lt: new Date(`${month}-31T23:59:59.999Z`),
      },
      status: "success", // or whatever status means "confirmed"
    },
    select: {
      id: true,
      date: true,
      // add other fields as needed
    },
  });

  return NextResponse.json({ bookings });
}
