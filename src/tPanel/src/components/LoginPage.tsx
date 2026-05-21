import React, { useState } from "react";
import { 
  Lock, 
  User, 
  Eye, 
  EyeOff,
  Globe,
  Loader2
} from "lucide-react";

interface LoginPageProps {
  onLogin: (user: string, pass: string) => Promise<void> | void;
}

export default function LoginPage({ onLogin }: LoginPageProps) {
  const [username, setUsername] = useState("");
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
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 font-sans antialiased">
      
      {/* Refined Login Container - DigitalOcean Style */}
      <div className="w-full max-w-[400px] mb-8">
        <div className="flex justify-center mb-8">
           <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-[#0069ff] rounded flex items-center justify-center text-white italic font-black text-xl">T</div>
              <span className="text-2xl font-black tracking-tighter text-slate-100">tPanel</span>
           </div>
        </div>

        <div className="bg-slate-900 rounded-lg shadow-[0_2px_10px_rgba(0,0,0,0.05)] border border-slate-700 overflow-hidden">
          <div className="p-8 pb-10">
            <h1 className="text-xl font-bold text-slate-100 mb-6 text-center">Log in to your account</h1>
            
            <form onSubmit={handleSubmit} className="space-y-5">
              
              {/* Username Field */}
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-400">Email or Username</label>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Username"
                  className="block w-full px-3 py-2.5 bg-slate-950 border border-slate-700 rounded text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-[#0069ff] focus:ring-1 focus:ring-[#0069ff] transition-all"
                />
              </div>

              {/* Password Field */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-semibold text-slate-400">Password</label>
                  <button type="button" className="text-xs font-bold text-[#0069ff] hover:underline">Forgot password?</button>
                </div>
                <div className="relative group">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password"
                    className="block w-full px-3 pr-10 py-2.5 bg-slate-950 border border-slate-700 rounded text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-[#0069ff] focus:ring-1 focus:ring-[#0069ff] transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Log In Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-[#0069ff] hover:bg-[#0055d4] text-white font-bold py-3 rounded shadow-sm active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer mt-6"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  "Log In"
                )}
              </button>
              {error && (
                <p className="rounded border border-red-500/20 bg-red-500/10 p-3 text-xs font-semibold text-red-300">
                  {error}
                </p>
              )}
            </form>
          </div>
        </div>

        <div className="mt-6 text-center">
          <p className="text-sm text-slate-600 font-medium">New to tPanel? <button className="text-[#0069ff] font-bold hover:underline">Create an account</button></p>
        </div>
      </div>
    </div>
  );
}
