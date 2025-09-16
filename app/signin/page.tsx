"use client";
export const dynamic = "force-dynamic";

import { useState, useEffect, Suspense } from "react";
import { signIn, useSession } from "next-auth/react";
import { useSearchParams, useRouter } from "next/navigation";

// Separate the main content into its own component
function SignInContent() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  const router = useRouter();

  // Redirect if already authenticated
  useEffect(() => {
    if (status === "authenticated") {
      router.replace("/admin");
    }
  }, [status, router]);

  // Show error from NextAuth if present
  const nextAuthError = searchParams.get("error");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
    setLoading(false);

    if (res?.ok) {
      // On successful sign-in, redirect to the admin page
      router.push("/admin");
    } else {
      setError("Sign in failed. Check the details you provided are correct.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <form
        onSubmit={handleSubmit}
        className="bg-gray-50 p-8 rounded-2xl shadow-lg w-full max-w-sm flex flex-col gap-4"
      >
        <h2 className="text-2xl font-bold text-black mb-2 text-center">Admin Login</h2>
        {(error || nextAuthError) && (
          <div className="bg-red-600 text-white px-4 py-2 rounded mb-2 text-center">
            Sign in failed. Check the details you provided are correct.
          </div>
        )}
        <label className="text-gray-800 font-medium">Email</label>
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          className="input input-bordered w-full bg-white text-gray-900"
          required
        />
        <label className="text-gray-800 font-medium">Password</label>
        <input
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          className="input input-bordered w-full bg-white text-gray-900"
          required
        />
        <button
          type="submit"
          className="w-full px-4 py-2 mt-4 bg-green-700 text-white font-semibold rounded-lg hover:bg-green-800 transition"
          disabled={loading}
        >
          {loading ? "Signing in..." : "Sign in with Credentials"}
        </button>
      </form>
    </div>
  );
}

// Main page component with Suspense boundary
export default function SignInPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <SignInContent />
    </Suspense>
  );
} 