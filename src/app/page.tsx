"use client";

import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import LoadingSpinner from "@/components/LoadingSpinner";

export default function Home() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && user) {
      router.push("/dashboard");
    }
  }, [user, isLoading, router]);

  if (isLoading) return <LoadingSpinner />;
  if (user) return null;

  return (
    <div className="max-w-3xl mx-auto px-4 py-16 text-center">
      <h1 className="text-4xl font-bold text-gray-900 mb-4">
        AI-Assisted Code Review
      </h1>
      <p className="text-lg text-gray-600 mb-8 max-w-xl mx-auto">
        Submit JavaScript code for automated static analysis. Get instant
        feedback on potential bugs, code quality issues, and security
        vulnerabilities.
      </p>
      <div className="flex gap-4 justify-center">
        <Link
          href="/register"
          className="rounded-md bg-blue-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
        >
          Get Started
        </Link>
        <Link
          href="/login"
          className="rounded-md border border-gray-300 bg-white px-6 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Log in
        </Link>
      </div>
    </div>
  );
}
