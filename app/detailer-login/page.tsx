"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Eye, EyeOff } from 'lucide-react';
import { signIn } from "next-auth/react";

export default function DetailerLogin() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [keepLoggedIn, setKeepLoggedIn] = useState(false);
  const router = useRouter();
  

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    
    try {
      // Use the dedicated detailer provider (separate from admin)
      const result = await signIn("detailer", {
        email: form.email,
        password: form.password,
        callbackUrl: "/detailer-dashboard/calendar",
        redirect: false // Handle redirect manually
      });
      
      if (result?.error) {
        setError("Invalid email or password");
      } else if (result?.ok) {
        setSuccess("Login successful! Redirecting...");
        // Redirect manually to detailer calendar
        router.push("/detailer-dashboard/calendar");
      }
    } catch (error) {
      setError("An error occurred during login");
    }
  };

  // Placeholder handlers for social logins
  const handleGoogleLogin = () => alert("Google login coming soon!");
  const handleXLogin = () => alert("X login coming soon!");

  return (
    <div className="min-h-screen w-full flex font-sans bg-gray-100">
      {/* Left: Login Form */}
      <div className="flex flex-col justify-center items-start w-full md:w-1/2 px-8 md:px-12 py-16 bg-white relative z-10 shadow-lg">
        <Link href="/" className="mb-8 flex items-center gap-1 text-sm text-green-600 hover:text-green-600">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
          Back to Homepage
        </Link>
        <div className="w-full flex flex-col gap-3 mb-8">
          <h1 className="text-4xl font-semibold text-gray-900">Sign In</h1>
          <p className="text-sm text-gray-500">Enter your email and password to sign in!</p>
        </div>
        <div className="w-full flex flex-col gap-5">
          {/* Social Login Buttons - Currently Disabled */}
          {/* <div className="flex gap-5 w-full">
            <button
              onClick={handleGoogleLogin}
              className="flex-1 h-11 px-6 bg-gray-100 rounded-lg flex items-center justify-center gap-3 hover:bg-gray-200 transition border border-gray-100"
            >
              <img src="/images/google-logo.svg" alt="Google" className="w-5 h-5" />
              <span className="text-sm text-gray-900 font-normal">Sign in with Google</span>
            </button>
            <button
              onClick={() => alert('Apple login coming soon!')}
              className="flex-1 h-11 px-6 bg-gray-100 rounded-lg flex items-center justify-center gap-3 hover:bg-gray-200 transition border border-gray-100"
            >
              <img src="/images/apple-logo.svg" alt="Apple" className="w-5 h-5" />
              <span className="text-sm text-gray-900 font-normal">Sign in with Apple</span>
            </button>
          </div>
          <div className="w-full flex items-center gap-2 my-2">
            <div className="flex-1 border-t border-gray-200"></div>
            <span className="text-xs text-gray-400">Or</span>
            <div className="flex-1 border-t border-gray-200"></div>
          </div> */}
          <form className="w-full flex flex-col gap-5" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded">
                {error}
              </div>
            )}
            {success && (
              <div className="bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded">
                {success}
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
                value={form.email}
                onChange={handleChange}
              />
            </div>
            <div className="relative w-full">
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                required
                className="h-11 w-full px-4 pr-10 py-2.5 bg-white rounded-lg shadow-[0_0_0_4px_rgba(70,95,255,0.12)] outline outline-1 outline-offset-[-1px] outline-green-300 focus:outline-2 focus:outline-green-500 text-gray-900 text-sm transition-all"
                placeholder="Enter your password"
                value={form.password}
                onChange={handleChange}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                 className="absolute inset-y-0 right-2 flex items-center text-gray-500"
                  tabIndex={-1}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <div className="flex justify-between items-center w-full">
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={keepLoggedIn}
                  onChange={() => setKeepLoggedIn(!keepLoggedIn)}
                  className="w-4 h-4 rounded border-gray-300 focus:ring-green-500"
                />
                Keep me logged in
              </label>
              <Link href="/detailer-login/forgot-password" className="text-green-600 text-sm hover:underline">
                Forgot password?
              </Link>
            </div>
            <button
              type="submit"
              className="w-full px-4 py-3 bg-green-600 rounded-lg text-white font-medium text-sm shadow hover:bg-green-700 transition"
            >
              Sign In
            </button>
            <div className="text-sm text-gray-700 text-center">
              {/* Removed Sign Up link since self-signup is disabled */}
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