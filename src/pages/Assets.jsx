/**
 * Assets.jsx
 */
import AppLayout from "../ui/AppLayout";

export default function Assets() {
  return (
    <AppLayout>
      {/* Top bar */}
      <div className="flex items-center px-6 py-4 border-b shrink-0"
        style={{ borderColor: "rgba(255,255,255,0.06)", background: "#0d0d14" }}>
        <h1 className="text-[20px] font-bold text-[#e8e8f0]" style={{ fontFamily: "'Outfit',sans-serif" }}>Assets</h1>
      </div>

      {/* Empty state */}
      <div className="flex-1 flex flex-col items-center justify-center gap-4">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" style={{ opacity: 0.1 }}>
          <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" stroke="white" strokeWidth="1.5"/>
          <polyline points="3.27 6.96 12 12.01 20.73 6.96" stroke="white" strokeWidth="1.5"/>
          <line x1="12" y1="22.08" x2="12" y2="12" stroke="white" strokeWidth="1.5"/>
        </svg>
        <div className="text-[18px] font-bold text-[#e8e8f0]" style={{ fontFamily: "'Outfit',sans-serif" }}>Assets</div>
        <div className="text-[14px]" style={{ color: "#55556a" }}>Coming soon — manage your uploaded media and files here.</div>
      </div>
    </AppLayout>
  );
}
