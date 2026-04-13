/**
 * System.jsx
 * Server health, memory, DB latency, API key status, temp files.
 */
import { useEffect, useState, useRef } from "react";
import AdminLayout from "./AdminLayout";
import { serverFetch } from "../../services/serverApi";

async function safeJson(res) {
  const text = await res.text();
  if (!res.ok) throw new Error(`Server ${res.status}: ${text.slice(0, 120)}`);
  try { return JSON.parse(text); } catch { throw new Error("Invalid server response"); }
}

function fmtUptime(secs) {
  const d = Math.floor(secs / 86400);
  const h = Math.floor((secs % 86400) / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  return `${m}m ${s}s`;
}

function StatusDot({ ok }) {
  return (
    <span className={`inline-block w-2.5 h-2.5 rounded-full shrink-0 ${ok ? "bg-[#22c55e]" : "bg-[#f97316]"}`}
      style={{ boxShadow: ok ? "0 0 6px #22c55e88" : "0 0 6px #f9731688" }} />
  );
}

function MetricRow({ label, value, sub, accent }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-white/[0.05] last:border-0">
      <div>
        <div className="text-sm text-[#aaa]">{label}</div>
        {sub && <div className="text-xs text-[#555] mt-0.5">{sub}</div>}
      </div>
      <div className="text-base font-semibold" style={{ color: accent || "#e8e8f0" }}>{value}</div>
    </div>
  );
}

function SectionCard({ title, children }) {
  return (
    <div className="bg-[#111118] border border-white/[0.08] rounded-2xl p-6">
      <div className="text-base font-semibold text-[#888] uppercase tracking-wider mb-4">{title}</div>
      {children}
    </div>
  );
}

export default function System() {
  const [data,      setData]      = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState("");
  const [lastPoll,  setLastPoll]  = useState(null);
  const intervalRef = useRef(null);

  async function load() {
    try {
      const res = await serverFetch("/api/admin/system-health");
      const d   = await safeJson(res);
      setData(d);
      setLastPoll(new Date());
      setError("");
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    intervalRef.current = setInterval(load, 15_000);
    return () => clearInterval(intervalRef.current);
  }, []);

  const heapPct = data
    ? Math.round((parseFloat(data.memMb.heap) / parseFloat(data.memMb.heapTotal)) * 100)
    : 0;

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-1 gap-4 flex-wrap">
        <h1 className="text-4xl font-bold">System</h1>
        <div className="flex items-center gap-3">
          {lastPoll && (
            <span className="text-xs text-[#555]">
              Updated {lastPoll.toLocaleTimeString()}
            </span>
          )}
          <button onClick={load}
            className="px-4 py-2 bg-white/[0.05] border border-white/[0.08] rounded-lg text-[#888] text-sm cursor-pointer hover:text-white hover:bg-white/10 transition-colors">
            ↻ Refresh
          </button>
        </div>
      </div>
      <p className="text-[#888] text-lg mb-8">Server health, memory, database, and API key status. Auto-refreshes every 15s.</p>

      {error && (
        <div className="bg-[#f97316]/10 border border-[#f97316]/30 rounded-xl px-5 py-4 text-[#f97316] text-sm mb-6">
          <div className="font-semibold mb-1">Cannot reach server</div>
          {error}
        </div>
      )}

      {loading && !data ? (
        <div className="text-[#666] text-xl animate-pulse">Loading…</div>
      ) : data && (
        <>
          {/* Top status bar */}
          <div className="flex items-center gap-3 bg-[#22c55e]/[0.07] border border-[#22c55e]/20 rounded-xl px-5 py-3.5 mb-8">
            <StatusDot ok={data.db.ok} />
            <span className="text-sm font-semibold text-[#22c55e]">Server online</span>
            <span className="text-[#555] text-sm">·</span>
            <span className="text-sm text-[#888]">Uptime {fmtUptime(data.uptime)}</span>
            <span className="text-[#555] text-sm">·</span>
            <span className="text-sm text-[#888]">Node {data.node}</span>
            <span className="text-[#555] text-sm">·</span>
            <span className="text-sm text-[#888]">{data.platform}</span>
          </div>

          <div className="grid gap-6 mb-6" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}>

            {/* Server */}
            <SectionCard title="Server">
              <MetricRow label="Uptime"    value={fmtUptime(data.uptime)} />
              <MetricRow label="Node.js"   value={data.node} />
              <MetricRow label="Platform"  value={data.platform} />
              <MetricRow label="Server ping" value={`${data.serverPingMs} ms`}
                accent={data.serverPingMs < 200 ? "#22c55e" : data.serverPingMs < 500 ? "#facc15" : "#f97316"} />
            </SectionCard>

            {/* Database */}
            <SectionCard title="Database">
              <div className="flex items-center gap-2.5 mb-4">
                <StatusDot ok={data.db.ok} />
                <span className={`text-sm font-semibold ${data.db.ok ? "text-[#22c55e]" : "text-[#f97316]"}`}>
                  {data.db.ok ? "Connected" : "Unreachable"}
                </span>
              </div>
              <MetricRow label="Supabase latency"
                value={data.db.latencyMs !== null ? `${data.db.latencyMs} ms` : "—"}
                accent={
                  data.db.latencyMs === null ? "#555"
                  : data.db.latencyMs < 200  ? "#22c55e"
                  : data.db.latencyMs < 500  ? "#facc15"
                  : "#f97316"
                } />
            </SectionCard>

            {/* Memory */}
            <SectionCard title="Memory">
              <MetricRow label="RSS"        value={`${data.memMb.rss} MB`} />
              <MetricRow label="Heap used"  value={`${data.memMb.heap} MB`}
                accent={heapPct > 80 ? "#f97316" : heapPct > 60 ? "#facc15" : "#22c55e"} />
              <MetricRow label="Heap total" value={`${data.memMb.heapTotal} MB`} sub={`${heapPct}% used`} />
              {/* Heap bar */}
              <div className="mt-3 bg-white/[0.05] rounded-full h-2 overflow-hidden">
                <div className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${heapPct}%`,
                    background: heapPct > 80 ? "#f97316" : heapPct > 60 ? "#facc15" : "#22c55e",
                  }} />
              </div>
            </SectionCard>

            {/* Temp files */}
            <SectionCard title="Temp Files">
              <MetricRow label="File count" value={data.temp.files}
                accent={data.temp.files > 50 ? "#f97316" : data.temp.files > 20 ? "#facc15" : "#e8e8f0"} />
              <MetricRow label="Disk usage" value={`${data.temp.sizeMb} MB`}
                sub="src/server/temp"
                accent={parseFloat(data.temp.sizeMb) > 500 ? "#f97316" : parseFloat(data.temp.sizeMb) > 100 ? "#facc15" : "#e8e8f0"} />
              {data.temp.files > 20 && (
                <div className="mt-3 text-xs text-[#facc15] bg-[#facc15]/[0.08] border border-[#facc15]/20 rounded-lg px-3 py-2">
                  Temp directory is filling up. Consider cleaning old render files.
                </div>
              )}
            </SectionCard>

            {/* API keys */}
            <SectionCard title="API Keys">
              {[
                { label: "OpenAI",           ok: data.apiKeys.openai },
                { label: "Supabase (service)", ok: data.apiKeys.supabase },
                { label: "Fal.ai",            ok: data.apiKeys.fal },
              ].map(k => (
                <div key={k.label} className="flex items-center justify-between py-3 border-b border-white/[0.05] last:border-0">
                  <span className="text-sm text-[#aaa]">{k.label}</span>
                  <div className="flex items-center gap-2">
                    <StatusDot ok={k.ok} />
                    <span className={`text-sm font-medium ${k.ok ? "text-[#22c55e]" : "text-[#f97316]"}`}>
                      {k.ok ? "Set" : "Missing"}
                    </span>
                  </div>
                </div>
              ))}
            </SectionCard>

          </div>
        </>
      )}
    </AdminLayout>
  );
}
