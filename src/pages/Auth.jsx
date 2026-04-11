import React, { useState } from "react";
import { signIn, signUp, requestPasswordReset } from "../services/auth/authService";
import { useNavigate } from "react-router-dom";

export default function Auth() {
  const navigate = useNavigate();

  const [mode, setMode] = useState("login"); // "login" | "register" | "forgot"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setError("");
    setInfo("");
    setLoading(true);
    try {
      if (mode === "login") {
        await signIn(email, password);
        navigate("/");
      } else if (mode === "register") {
        await signUp(email, password);
        navigate("/");
      } else if (mode === "forgot") {
        await requestPasswordReset(email);
        setInfo("Check your email — a password reset link has been sent.");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e) => {
    if (e.key === "Enter") handleSubmit();
  };

  return (
    <div className="flex h-screen items-center justify-center bg-[#0b0b10]">
      <div className="w-[380px] rounded-[14px] bg-[#13131f] border border-[rgba(255,255,255,0.08)] p-8 shadow-2xl">

        <h2 className="mb-1 text-[22px] font-bold text-[#e8e8f0]" style={{ fontFamily: "'Syne', sans-serif" }}>
          {mode === "login" ? "Welcome back" : mode === "register" ? "Create account" : "Reset password"}
        </h2>
        <p className="mb-6 text-[13px] text-[#55556a]">
          {mode === "forgot"    ? "Enter your email and we'll send a reset link."
           : mode === "register" ? "Create your account to get started."
           : "Sign in to continue."}
        </p>

        <input
          type="email"
          placeholder="Email"
          className="mb-3 w-full rounded-[8px] border border-[rgba(255,255,255,0.1)] bg-[#0d0d18] px-3 py-[10px] text-[14px] text-[#e8e8f0] placeholder-[#55556a] outline-none focus:border-[#7c5cfc]"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={handleKey}
        />

        {mode !== "forgot" && (
          <input
            type="password"
            placeholder="Password"
            className="mb-4 w-full rounded-[8px] border border-[rgba(255,255,255,0.1)] bg-[#0d0d18] px-3 py-[10px] text-[14px] text-[#e8e8f0] placeholder-[#55556a] outline-none focus:border-[#7c5cfc]"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={handleKey}
          />
        )}

        {error && (
          <div className="mb-4 rounded-[8px] bg-[rgba(248,113,113,0.1)] border border-[rgba(248,113,113,0.3)] px-3 py-2 text-[13px] text-[#f87171]">
            {error}
          </div>
        )}

        {info && (
          <div className="mb-4 rounded-[8px] bg-[rgba(124,92,252,0.1)] border border-[rgba(124,92,252,0.3)] px-3 py-2 text-[13px] text-[#a78bfa]">
            {info}
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full rounded-[8px] py-[10px] text-[14px] font-bold text-white disabled:opacity-50 transition-opacity hover:opacity-90"
          style={{ background: "#7c5cfc" }}
        >
          {loading
            ? "Please wait…"
            : mode === "login" ? "Sign in"
            : mode === "register" ? "Create account"
            : "Send reset link"}
        </button>

        <div className="mt-5 flex flex-col items-center gap-2 text-[13px] text-[#55556a]">
          {mode === "login" && (
            <>
              <button
                onClick={() => { setMode("forgot"); setError(""); setInfo(""); }}
                className="text-[#7c5cfc] hover:opacity-80 bg-transparent border-0 cursor-pointer p-0"
              >
                Forgot password?
              </button>
              <span>
                No account?{" "}
                <button
                  onClick={() => { setMode("register"); setError(""); setInfo(""); }}
                  className="text-[#7c5cfc] hover:opacity-80 bg-transparent border-0 cursor-pointer p-0"
                >
                  Register
                </button>
              </span>
            </>
          )}

          {mode === "register" && (
            <span>
              Already have an account?{" "}
              <button
                onClick={() => { setMode("login"); setError(""); setInfo(""); }}
                className="text-[#7c5cfc] hover:opacity-80 bg-transparent border-0 cursor-pointer p-0"
              >
                Sign in
              </button>
            </span>
          )}

          {mode === "forgot" && (
            <button
              onClick={() => { setMode("login"); setError(""); setInfo(""); }}
              className="text-[#7c5cfc] hover:opacity-80 bg-transparent border-0 cursor-pointer p-0"
            >
              ← Back to sign in
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
