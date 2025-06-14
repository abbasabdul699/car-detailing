"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    // TODO: Implement API call to send reset link
    // Example:
    // const res = await fetch("/api/detailer/auth/forgot-password", { ... });
    // if (res.ok) setSuccess("Check your email for a reset link!");
    setSuccess("If this email exists, a reset link has been sent!");
  };

  return (
    <div className="min-h-screen w-full flex font-sans bg-gray-100">
      {/* Left: Forgot Password Form */}
      <div className="flex flex-col justify-center items-start w-full md:w-1/2 px-8 md:px-12 py-16 bg-white relative z-10 shadow-lg">
        <Link href="/detailer-login" className="mb-8 flex items-center gap-1 text-sm text-gray-400 hover:text-indigo-600">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
          Back to Sign In
        </Link>
        <div className="w-full flex flex-col gap-3 mb-8">
          <h1 className="text-4xl font-semibold text-gray-900">Forgot Your Password?</h1>
          <p className="text-sm text-gray-500">
            Enter the email address linked to your account, and we'll send you a link to reset your password.
          </p>
        </div>
        <form className="w-full flex flex-col gap-5" onSubmit={handleSubmit}>
          <div className="flex flex-col gap-1.5 w-full">
            <label htmlFor="email" className="text-sm font-medium text-gray-700 flex items-center gap-1">
              Email <span className="text-red-500">*</span>
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              className="h-11 px-4 py-2.5 bg-white rounded-lg shadow-[0_1px_2px_0px_rgba(16,24,40,0.05)] outline outline-1 outline-offset-[-1px] outline-gray-300 focus:outline-2 focus:outline-indigo-500 text-gray-900 text-sm transition-all"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <button
            type="submit"
            className="w-full px-4 py-3 bg-indigo-600 rounded-lg text-white font-medium text-sm shadow hover:bg-indigo-700 transition outline outline-1 outline-offset-[-1px] outline-indigo-600"
          >
            Send Reset Link
          </button>
          {success && <div className="text-green-600">{success}</div>}
          {error && <div className="text-red-600">{error}</div>}
          <div className="text-sm text-gray-700">
            Wait, I remember my password...{" "}
            <Link href="/detailer-login" className="text-indigo-600 font-medium hover:underline">Click here</Link>
          </div>
        </form>
      </div>
      {/* Right: Branding Section */}
      <div className="hidden md:flex w-1/2 bg-[#181C32] relative">
        <div className="absolute inset-0 flex flex-col justify-center items-center">
          <div className="flex flex-col items-center gap-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-indigo-600 rounded-lg flex items-center justify-center">
                <img src="/images/logo.png" alt="Reeva Car Logo" className="w-10 h-10 rounded-lg" />
              </div>
              <span className="text-white text-2xl font-semibold">Reeva Car</span>
            </div>
            <div className="text-white/60 text-sm text-center max-w-xs">
              Change the way you get your car detailed
            </div>
          </div>
        </div>
        {/* Decorative squares */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-10 left-10 w-8 h-8 bg-white/10 rounded-lg"></div>
          <div className="absolute bottom-10 right-10 w-8 h-8 bg-white/10 rounded-lg"></div>
          <div className="absolute top-1/2 left-1/2 w-8 h-8 bg-white/10 rounded-lg" style={{transform: 'translate(-50%, -50%)'}}></div>
        </div>
      </div>
    </div>
  );
}
