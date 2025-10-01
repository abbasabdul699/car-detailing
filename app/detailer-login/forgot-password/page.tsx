"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage("Password reset link sent to your email!");
      } else {
        setError(data.error || "Failed to send reset email");
      }
    } catch (err) {
      setError("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex font-sans bg-gray-100">
      {/* Left: Forgot Password Form */}
      <div className="flex flex-col justify-center items-start w-full md:w-1/2 px-8 md:px-12 py-16 bg-white relative z-10 shadow-lg">
        <Link href="/detailer-login" className="mb-8 flex items-center gap-1 text-sm text-green-600 hover:text-green-600">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
          Back to Sign In
        </Link>
        
        <div className="w-full flex flex-col gap-3 mb-8">
          <h1 className="text-4xl font-semibold text-gray-900">Forgot Password?</h1>
          <p className="text-sm text-gray-500">Enter your email address and we'll send you a link to reset your password.</p>
        </div>

        <div className="w-full flex flex-col gap-5">
          <form className="w-full flex flex-col gap-5" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded">
                {error}
              </div>
            )}
            {message && (
              <div className="bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded">
                {message}
              </div>
            )}
            
            <div className="flex flex-col gap-1.5 w-full">
              <label htmlFor="email" className="text-sm font-medium text-gray-700 flex items-center gap-1">
                Email <span className="text-red-500">*</span>
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="h-11 px-4 py-2.5 bg-white rounded-lg shadow-[0_0_0_4px_rgba(70,95,255,0.12)] outline outline-1 outline-offset-[-1px] outline-green-300 focus:outline-2 focus:outline-green-500 text-gray-900 text-sm transition-all"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full px-4 py-3 bg-green-600 rounded-lg text-white font-medium text-sm shadow hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Sending..." : "Send Reset Link"}
            </button>

            <div className="text-sm text-gray-700 text-center">
              Remember your password?{" "}
              <Link href="/detailer-login" className="text-green-600 hover:underline">
                Sign in here
              </Link>
            </div>
          </form>
        </div>
      </div>

      {/* Right: Branding Section */}
      <div
        className="hidden md:flex w-1/2 bg-cover bg-center"
        style={{ backgroundImage: "url('https://reevacar.s3.us-east-2.amazonaws.com/reeva-logo/Screenshot+2025-06-21+at+12.35.31%E2%80%AFAM.png')" }}
      >
        {/* This div is intentionally left empty to only show the background image. */}
      </div>
    </div>
  );
}
