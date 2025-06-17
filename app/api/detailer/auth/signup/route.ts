import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import dbConnect from "@/lib/dbConnect";
import Detailer from "@/app/models/Detailer";

export async function POST(req: Request) {
  try {
    const { firstName, lastName, email, password } = await req.json();
    if (!firstName || !lastName || !email || !password) {
      return NextResponse.json({ message: "All fields are required" }, { status: 400 });
    }
    await dbConnect();
    const existing = await Detailer.findOne({ email });
    if (existing) {
      return NextResponse.json({ message: "Email already in use" }, { status: 400 });
    }
    const hashed = await bcrypt.hash(password, 10);
    const newDetailer = new Detailer({
      email,
      password: hashed,
      firstName,
      lastName,
      // Add other fields as needed
    });
    await newDetailer.save();
    return NextResponse.json({ message: "Account created" });
  } catch (e) {
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}