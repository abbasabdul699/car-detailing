import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verify } from "jsonwebtoken";
import dbConnect from "@/lib/dbConnect";
import Detailer from "@/app/models/Detailer";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("detailer_token");

    if (!token) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }

    // Verify token and get detailer ID
    const decoded = verify(
      token.value,
      process.env.JWT_SECRET || "your-secret-key"
    ) as { id: string };

    await dbConnect();
    const detailer = await Detailer.findById(decoded.id);

    if (!detailer) {
      return NextResponse.json(
        { message: "Detailer not found" },
        { status: 404 }
      );
    }

    // For now, return mock data
    // In a real application, you would calculate these values from your database
    const stats = {
      totalAppointments: 0, // TODO: Implement appointment counting
      totalEarnings: 0, // TODO: Implement earnings calculation
      averageRating: 0, // TODO: Implement rating calculation
      totalCustomers: 0, // TODO: Implement customer counting
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
} 