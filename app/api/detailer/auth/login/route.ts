// /pages/api/detailer/auth/login.ts

import { NextRequest, NextResponse } from "next/server";
import { serialize } from "cookie";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import dbConnect from "@/lib/dbConnect"; // Update to your actual DB connector
import Detailer from "@/app/models/Detailer"; // Your Mongoose model

export async function POST(req: NextRequest) {
  // Parse JSON body
  const { email, password } = await req.json();

  await dbConnect(); // Ensure DB connection

  const detailer = await Detailer.findOne({ email });
  if (!detailer) {
    return NextResponse.json({ message: "Invalid email or password" }, { status: 401 });
  }

  console.log("Request body:", { email, password });
  console.log("Found detailer:", detailer);
  console.log("Stored hash:", detailer?.password);

  const passwordMatch = await bcrypt.compare(password, detailer.password);
  if (!passwordMatch) {
    return NextResponse.json({ message: "Invalid email or password" }, { status: 401 });
  }

  console.log("Password match:", passwordMatch);

  const token = jwt.sign(
    { id: detailer._id },
    process.env.JWT_SECRET || "your-secret-key",
    { expiresIn: "7d" }
  );

  // Set cookie using NextResponse (App Router best practice)
  const response = NextResponse.json({ detailer });
  response.cookies.set("detailer_token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 1 week
  });

  return response;
}