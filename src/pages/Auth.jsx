import { signInWithGoogle } from "../services/auth/authService";

export default function Auth() {
  return (
    <div className="flex h-screen items-center justify-center bg-[#0F0E1A]">
      <div className="w-[380px] rounded-[14px] bg-[#13131f] border border-[rgba(255,255,255,0.08)] p-8 shadow-2xl">

        <h2 className="mb-1 text-[22px] font-bold text-[#e8e8f0]" style={{ fontFamily: "'Outfit', sans-serif" }}>
          Welcome
        </h2>
        <p className="mb-6 text-[13px] text-[#55556a]">
          Sign in to continue.
        </p>

        <button
          onClick={signInWithGoogle}
          className="w-full rounded-[8px] border border-[rgba(255,255,255,0.1)] bg-[#0d0d18] px-3 py-[10px] text-[14px] text-[#e8e8f0] hover:border-[rgba(255,255,255,0.25)] hover:bg-[#13131f] transition-all cursor-pointer flex items-center justify-center gap-2"
        >
          <img src="https://www.google.com/favicon.ico" width="16" height="16" alt="" />
          Continue with Google
        </button>

      </div>
    </div>
  );
}
