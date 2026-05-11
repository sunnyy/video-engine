import React, { useState } from "react";
import { updatePassword } from "../services/auth/authService";
import { useNavigate } from "react-router-dom";

export default function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setError("");
    if (!password) { setError("Enter a new password."); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
    if (password !== confirm) { setError("Passwords don't match."); return; }

    setLoading(true);
    try {
      await updatePassword(password);
      navigate("/");
    } catch (err) {
      const msg = err.message || "";
      if (msg.toLowerCase().includes("jwt") || msg.toLowerCase().includes("not authenticated") || msg.toLowerCase().includes("session")) {
        setError("Your reset link has expired. Please request a new password reset.");
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen items-center justify-center bg-[#0b0b10]">
      <div className="w-[380px] rounded-[14px] bg-[#13131f] border border-[rgba(255,255,255,0.08)] p-8 shadow-2xl">

        <h2 className="mb-1 text-[22px] font-bold text-[#e8e8f0]" style={{ fontFamily: "'Outfit', sans-serif" }}>
          Set new password
        </h2>
        <p className="mb-6 text-[13px] text-[#55556a]">
          Choose a new password for your account.
        </p>

        <input
          type="password"
          placeholder="New password"
          className="mb-3 w-full rounded-[8px] border border-[rgba(255,255,255,0.1)] bg-[#0d0d18] px-3 py-[10px] text-[14px] text-[#e8e8f0] placeholder-[#55556a] outline-none focus:border-[#7c5cfc]"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
        />

        <input
          type="password"
          placeholder="Confirm password"
          className="mb-4 w-full rounded-[8px] border border-[rgba(255,255,255,0.1)] bg-[#0d0d18] px-3 py-[10px] text-[14px] text-[#e8e8f0] placeholder-[#55556a] outline-none focus:border-[#7c5cfc]"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
        />

        {error && (
          <div className="mb-4 rounded-[8px] bg-[rgba(248,113,113,0.1)] border border-[rgba(248,113,113,0.3)] px-3 py-2 text-[13px] text-[#f87171]">
            {error}
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full rounded-[8px] py-[10px] text-[14px] font-bold text-white disabled:opacity-50 transition-opacity hover:opacity-90"
          style={{ background: "#7c5cfc" }}
        >
          {loading ? "Saving…" : "Update password"}
        </button>

      </div>
    </div>
  );
}
