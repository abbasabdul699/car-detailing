"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signIn, useSession } from "next-auth/react";
import DetailerSessionProvider from "@/app/components/DetailerSessionProvider";

function DetailerLoginInner() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();
  const { data: session, status } = useSession();

  // Redirect if already authenticated
  useEffect(() => {
    // Only proceed if session status is determined (not loading)
    if (status === "loading") return;
    
    if (status === "authenticated" && session?.user) {
      // Check if user is a detailer
      const userRole = (session.user as any)?.role;
      if (userRole === "detailer") {
        // Use window.location for a more forceful redirect
        window.location.href = "/detailer-dashboard/calendar";
        return;
      }
    }
  }, [status, session]);
  

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      setError("Please enter both email and password.");
      return;
    }

    try {
      const result = await signIn("detailer", {
        email,
        password,
        callbackUrl: "/detailer-dashboard/calendar",
        redirect: false,
      });

      if (result?.error) {
        setError("Invalid email or password");
      } else if (result?.ok) {
        router.push("/detailer-dashboard/calendar");
      }
    } catch {
      setError("An error occurred during login");
    }
  };

  return (
    <div className="flex h-screen bg-[#FAFAFA]">
      <div className="w-full md:w-1/2 flex items-center justify-center px-6 md:px-16">
        <div className="w-full max-w-[380px]">
          <h1 className="text-[26px] font-normal text-[#1A1A1A] mb-2 leading-tight">Welcome back</h1>
          <p className="text-sm text-[#6B7280] font-light mb-8">Sign in to your account to continue.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs text-[#1A1A1A] mb-1.5 font-normal">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError("");
                }}
                placeholder="you@example.com"
                className="w-full px-3.5 py-2.5 rounded-2xl border border-[#e0e0de] bg-white text-sm text-[#1A1A1A] placeholder:text-[#9e9d92] outline-none focus:border-[#FB4803] focus:ring-1 focus:ring-[#FB4803]/20 transition-all"
                data-testid="input-email"
              />
            </div>
            <div>
              <label className="block text-xs text-[#1A1A1A] mb-1.5 font-normal">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError("");
                }}
                placeholder="Enter your password"
                className="w-full px-3.5 py-2.5 rounded-2xl border border-[#e0e0de] bg-white text-sm text-[#1A1A1A] placeholder:text-[#9e9d92] outline-none focus:border-[#FB4803] focus:ring-1 focus:ring-[#FB4803]/20 transition-all"
                data-testid="input-password"
              />
            </div>

            {error && (
              <p className="text-xs text-red-500" data-testid="text-login-error">{error}</p>
            )}

            <button
              type="submit"
              className="w-full py-2.5 text-[14px] font-medium text-white rounded-2xl transition-colors hover:opacity-90"
              style={{ backgroundColor: "#FB4803" }}
              data-testid="button-sign-in"
            >
              Sign in
            </button>
          </form>

          <p className="text-xs text-[#6B7280] mt-6 text-center">
            Don&apos;t have an account?{" "}
            <Link
              href="/sms-signup"
              className="underline text-[#FB4803]"
              data-testid="link-create-account"
            >
              Create one
            </Link>
          </p>
        </div>
      </div>

      <div className="hidden md:block w-1/2 p-4">
        <div className="h-full w-full rounded-2xl overflow-hidden">
          <img
            src="/images/login-bg.png"
            alt="Space pixel art"
            className="h-full w-full object-cover"
          />
        </div>
      </div>
    </div>
  );
}

export default function DetailerLogin() {
  return (
    <DetailerSessionProvider>
      <DetailerLoginInner />
    </DetailerSessionProvider>
  );
}
