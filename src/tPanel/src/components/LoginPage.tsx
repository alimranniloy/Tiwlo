import React, { useState } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import BrandLogo from "./BrandLogo";

interface LoginPageProps {
  onLogin: (user: string, pass: string) => Promise<void> | void;
}

const FacebookIcon = () => (
  <svg viewBox="0 0 24 24" className="h-[22px] w-[22px] fill-white" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path d="M12.001 2C6.47813 2 2.00098 6.47715 2.00098 12C2.00098 16.9913 5.65783 21.1283 10.4385 21.8785V14.8906H7.89941V12H10.4385V9.79688C10.4385 7.29063 11.9314 5.90625 14.2156 5.90625C15.3097 5.90625 16.4541 6.10156 16.4541 6.10156V8.5625H15.1931C13.9509 8.5625 13.5635 9.33334 13.5635 10.1242V12H16.3369L15.8936 14.8906H13.5635V21.8785C18.3441 21.1283 22.001 16.9913 22.001 12C22.001 6.47715 17.5238 2 12.001 2Z" />
  </svg>
);

const AppleIcon = () => (
  <svg viewBox="0 0 24 24" className="h-[22px] w-[22px] fill-white" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path d="M11.6734 7.2221C10.7974 7.2221 9.44138 6.2261 8.01338 6.2621C6.12938 6.2861 4.40138 7.3541 3.42938 9.0461C1.47338 12.4421 2.92538 17.4581 4.83338 20.2181C5.76938 21.5621 6.87338 23.0741 8.33738 23.0261C9.74138 22.9661 10.2694 22.1141 11.9734 22.1141C13.6654 22.1141 14.1454 23.0261 15.6334 22.9901C17.1454 22.9661 18.1054 21.6221 19.0294 20.2661C20.0974 18.7061 20.5414 17.1941 20.5654 17.1101C20.5294 17.0981 17.6254 15.9821 17.5894 12.6221C17.5654 9.8141 19.8814 8.4701 19.9894 8.4101C18.6694 6.4781 16.6414 6.2621 15.9334 6.2141C14.0854 6.0701 12.5374 7.2221 11.6734 7.2221ZM14.7934 4.3901C15.5734 3.4541 16.0894 2.1461 15.9454 0.850098C14.8294 0.898098 13.4854 1.5941 12.6814 2.5301C11.9614 3.3581 11.3374 4.6901 11.5054 5.9621C12.7414 6.0581 14.0134 5.3261 14.7934 4.3901Z" />
  </svg>
);

export default function LoginPage({ onLogin }: LoginPageProps) {
  const [username, setUsername] = useState(() => {
    try {
      return new URLSearchParams(window.location.search).get("username") || "";
    } catch {
      return "";
    }
  });
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    try {
      await onLogin(username, password);
    } catch (err: any) {
      setError(err?.message || "Unable to sign in.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f3f5f9] px-4 py-8 font-sans text-[#212121] antialiased sm:px-6">
      <div className="box-border flex w-full max-w-[350px] flex-col gap-6 rounded-[10px] bg-white px-6 py-8 text-sm shadow-[0_0_3px_rgba(0,0,0,0.084),0_2px_3px_rgba(0,0,0,0.168)]">
        <div className="mb-3 text-center text-xl font-bold">
          <div className="mb-4 flex justify-center">
            <BrandLogo className="h-14 w-40" />
          </div>
          <div>Welcome Back!</div>
        </div>

        <div className="mb-5 flex flex-col items-center justify-center gap-3">
          <button type="button" className="flex w-full items-center justify-center gap-2 rounded-md bg-[#1778f2] px-4 py-3 text-white shadow-[0_0_3px_rgba(0,0,0,0.084),0_2px_3px_rgba(0,0,0,0.168)] active:scale-95">
            <FacebookIcon />
            <span>Sign in with Facebook</span>
          </button>
          <button type="button" className="flex w-full items-center justify-center gap-2 rounded-md bg-[#212121] px-4 py-3 text-white shadow-[0_0_3px_rgba(0,0,0,0.084),0_2px_3px_rgba(0,0,0,0.168)] active:scale-95">
            <AppleIcon />
            <span>Sign in with Apple</span>
          </button>
        </div>

        <div className="h-px w-full bg-[#212121] opacity-10" />

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-0.5">
            <label htmlFor="tpanel-user" className="mb-1 block">Email or Username</label>
            <input
              id="tpanel-user"
              type="text"
              required
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                setError("");
              }}
              placeholder="Enter your email"
              className="block w-full rounded-md border border-[#cccccc] bg-white px-4 py-3 text-sm outline-none placeholder:opacity-50 focus:border-[#1778f2]"
            />
          </div>

          <div className="flex flex-col gap-0.5">
            <label htmlFor="tpanel-password" className="mb-1 block">Password</label>
            <div className="relative">
              <input
                id="tpanel-password"
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError("");
                }}
                placeholder="Enter your password"
                className="block w-full rounded-md border border-[#cccccc] bg-white px-4 py-3 pr-10 text-sm outline-none placeholder:opacity-50 focus:border-[#1778f2]"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-[#777] transition-colors hover:text-[#212121]"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {error && (
            <p className="rounded-md border border-red-100 bg-red-50 px-3 py-2 text-xs font-semibold text-red-600">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="my-3 flex w-full cursor-pointer items-center justify-center gap-2 rounded-md bg-[#212121] px-4 py-3 text-sm text-white shadow-[0_0_3px_rgba(0,0,0,0.084),0_2px_3px_rgba(0,0,0,0.168)] transition hover:bg-[#313131] active:scale-95 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Sign In"}
          </button>
        </form>

        <button type="button" className="-mt-5 self-end text-[#1778f2] hover:underline">Forgot Password</button>
        <p className="text-center text-sm font-medium">
          Don't have an account?
          <button type="button" className="ml-1 font-normal text-[#1778f2] hover:underline">Sign up now</button>
        </p>
      </div>
    </div>
  );
}
