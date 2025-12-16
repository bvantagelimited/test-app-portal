'use client';

import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function LoginContent() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";
  const error = searchParams.get("error");

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4">
      <div className="max-w-md w-full">
        {/* Logo and Title */}
        <div className="text-center mb-8">
          <img 
            src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0NC44OTIiIGhlaWdodD0iNDUiIHZpZXdCb3g9IjAgMCA0NC44OTIgNDUiPjxkZWZzPjxzdHlsZT4uYXtmaWxsOiNmZmY7fS5ie2ZpbGw6I2ZiMWM0NDt9PC9zdHlsZT48L2RlZnM+PHJlY3QgY2xhc3M9ImEiIHdpZHRoPSIzMSIgaGVpZ2h0PSIyNiIgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoNi45OTkgOSkiLz48ZyB0cmFuc2Zvcm09InRyYW5zbGF0ZSgwIDApIj48cGF0aCBjbGFzcz0iYiIgZD0iTTcuNDIxLDYuNjc1LDkuNjU3LDQuNTA3VjBIMFY2LjY3NVoiIHRyYW5zZm9ybT0idHJhbnNsYXRlKDIyLjM4NSAxNS4yOTUpIi8+PHBhdGggY2xhc3M9ImIiIGQ9Ik0wLDQ1VjBINDQuODkyVjMyLjAxOUwzMS45NjcsNDQuOTc1Wk0xOC4yMDgsMTEuMDgzVjMzLjk0MWg0LjJWMjYuMTgySDMxLjU1bDQuNjkzLTQuNTA4aC4wMjVWMTEuMDgzWm0tOS41NTgsMFYzMy45NDFoNC4yVjExLjA4M1oiLz48L2c+PC9zdmc+"
            alt="IPification Logo"
            className="h-12 w-auto mx-auto mb-4"
          />
          <h1 className="text-2xl font-bold text-gray-900">App Distribution</h1>
          {/* <p className="text-gray-500 mt-2">Internal app sharing tool</p> */}
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
          {/* <h2 className="text-xl font-semibold text-gray-900 text-center mb-6">
            Sign in to continue
          </h2> */}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-red-800 text-center">
                {error === "AccessDenied" 
                  ? "Access denied. Only @ipification.com emails are allowed."
                  : "An error occurred during sign in. Please try again."}
              </p>
            </div>
          )}

          <button
            onClick={() => signIn("google", { callbackUrl })}
            className="w-full flex items-center justify-center gap-3 bg-white border border-gray-300 rounded-lg px-4 py-3 text-gray-700 font-medium hover:bg-gray-50 hover:border-gray-400 transition-all"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Sign in with Google
          </button>

          <p className="text-xs text-gray-500 text-center mt-6">
            Only <span className="font-medium">@ipification.com</span> email addresses are allowed
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#fc1c44] border-t-transparent rounded-full animate-spin"></div>
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}
