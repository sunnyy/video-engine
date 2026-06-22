/**
 * Monitoring.jsx — admin Automation/worker observability. Queue depth, in-flight work,
 * failures, throughput timings, publish success rate, worker liveness, the global kill
 * switch, and a live audit feed. Read-only except the kill switch. Auto-refreshes.
 */
import { useEffect, useState, useRef } from "react";
import AdminLayout from "./AdminLayout";
import { serverFetch } from "../../services/serverApi";

async function safeJson(res) {
  const text = await res.text();
  if (!res.ok) throw new Error(`Server ${res.status}: ${text.slice(0, 120)}`);
  try { return JSON.parse(text); } catch { throw new Error("Invalid server response"); }
}

const fmtMs = (ms) => ms == null ? "—" : ms < 1000 ? `${ms} ms` : ms < 60000 ? `${(ms / 1000).toFixed(1)}s` : `${Math.floor(ms / 60000)}m ${Math.round((ms % 60000) / 1000)}s`;
const ago = (iso) => { if (!iso) return "never"; const s = Math.floor((Date.now() - new Date(iso)) / 1000); return s < 60 ? `${s}s ago` : s < 3600 ? `${Math.floor(s / 60)}m ago` : `${Math.floor(s / 3600)}h ago`; };

const STATUS_COLOR = { ok: "#22c55e", fail: "#f87171", retry: "#facc15", skip: "#8896a8", info: "#38bdf8" };
const TYPE_LABEL = { generate_video: "Generate", render_timeline: "Render", publish_post: "Publish", refill_topics: "Refill topics" };

function Stat({ label, value, accent, sub }) {
  return (
    <div className="bg-[#111118] border border-white/[0.08] rounded-2xl p-5">
      <div className="text-xs text-[#888] uppercase tracking-wider mb-2">{label}</div>
      <div className="text-3xl font-bold" style={{ color: accent || "#e8e8f0" }}>{value}</div>
      {sub && <div className="text-xs text-[#555] mt-1">{sub}</div>}
    </div>
  );
}

export default function Monitoring() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [lastPoll, setLastPoll] = useState(null);
  const [busy, setBusy] = useState(false);
  const timer = useRef(null);

  async function load() {
    try { setData(await safeJson(await serverFetch("/api/monitoring/metrics"))); setLastPoll(new Date()); setError(""); }
    catch (e) { setError(e.message); }
  }
  useEffect(() => { load(); timer.current = setInterval(load, 15_000); return () => clearInterval(timer.current); }, []);

  async function toggleKill(on) {
    setBusy(true);
    try { await serverFetch("/api/flags/kill-switch", { method: "POST", body: JSON.stringify({ on }) }); await load(); }
    catch (e) { setError(e.message); } finally { setBusy(false); }
  }

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-1 gap-4 flex-wrap">
        <h1 className="text-4xl font-bold">Monitoring</h1>
        <div className="flex items-center gap-3">
          {lastPoll && <span className="text-xs text-[#555]">Updated {lastPoll.toLocaleTimeString()}</span>}
          <button onClick={load} className="px-4 py-2 bg-white/[0.05] border border-white/[0.08] rounded-lg text-[#888] text-sm cursor-pointer hover:text-white hover:bg-white/10 transition-colors">↻ Refresh</button>
        </div>
      </div>
      <p className="text-[#888] text-lg mb-8">Automation queue, worker health, throughput, and audit feed. Auto-refreshes every 15s.</p>

      {error && <div className="bg-[#f97316]/10 border border-[#f97316]/30 rounded-xl px-5 py-4 text-[#f97316] text-sm mb-6"><div className="font-semibold mb-1">Error</div>{error}</div>}

      {!data ? <div className="text-[#666] text-xl animate-pulse">Loading…</div> : (
        <>
          {/* Worker status + kill switch */}
          <div className="flex items-center gap-4 flex-wrap bg-[#111118] border border-white/[0.08] rounded-xl px-5 py-4 mb-6">
            <span className="inline-flex items-center gap-2 text-sm font-semibold" style={{ color: data.worker.alive ? "#22c55e" : "#f87171" }}>
              <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: data.worker.alive ? "#22c55e" : "#f87171" }} />
              Worker {data.worker.alive ? "online" : "offline"}
            </span>
            <span className="text-[#555] text-sm">·</span>
            <span className="text-sm text-[#888]">Heartbeat {ago(data.worker.heartbeat)}</span>
            <div className="flex-1" />
            <span className="text-sm" style={{ color: data.worker.killSwitch ? "#f87171" : "#8896a8" }}>
              Kill switch: <b>{data.worker.killSwitch ? "ON" : "off"}</b>
            </span>
            <button onClick={() => toggleKill(!data.worker.killSwitch)} disabled={busy}
              className="px-4 py-2 rounded-lg text-sm font-bold cursor-pointer transition-colors border"
              style={data.worker.killSwitch
                ? { borderColor: "#22c55e55", color: "#22c55e", background: "transparent" }
                : { borderColor: "#f8717155", color: "#f87171", background: "transparent" }}>
              {data.worker.killSwitch ? "Resume workers" : "Stop all workers"}
            </button>
          </div>

          {/* Top stats */}
          <div className="grid gap-4 mb-6" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))" }}>
            <Stat label="Queued" value={data.queue.queued} accent="#38bdf8" />
            <Stat label="Running" value={data.queue.running} accent="#facc15" />
            <Stat label="Failed (24h)" value={data.queue.failed24h} accent={data.queue.failed24h ? "#f87171" : "#22c55e"} />
            <Stat label="Publish success (7d)" value={data.publish.successRate == null ? "—" : `${data.publish.successRate}%`}
              accent={data.publish.successRate == null ? "#555" : data.publish.successRate >= 90 ? "#22c55e" : data.publish.successRate >= 70 ? "#facc15" : "#f87171"}
              sub={`${data.publish.published7d} ok · ${data.publish.failed7d} failed`} />
          </div>

          <div className="grid gap-6 mb-6" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))" }}>
            {/* Throughput timings */}
            <div className="bg-[#111118] border border-white/[0.08] rounded-2xl p-6">
              <div className="text-base font-semibold text-[#888] uppercase tracking-wider mb-4">Avg duration (24h)</div>
              {Object.keys(TYPE_LABEL).map((t) => (
                <div key={t} className="flex items-center justify-between py-2.5 border-b border-white/[0.05] last:border-0">
                  <span className="text-sm text-[#aaa]">{TYPE_LABEL[t]}</span>
                  <span className="text-sm font-semibold text-[#e8e8f0]">{fmtMs(data.timings[t]?.avgMs)} <span className="text-[#555] font-normal">({data.timings[t]?.count || 0})</span></span>
                </div>
              ))}
            </div>

            {/* Queued by type */}
            <div className="bg-[#111118] border border-white/[0.08] rounded-2xl p-6">
              <div className="text-base font-semibold text-[#888] uppercase tracking-wider mb-4">Queue by type</div>
              {Object.keys(TYPE_LABEL).map((t) => (
                <div key={t} className="flex items-center justify-between py-2.5 border-b border-white/[0.05] last:border-0">
                  <span className="text-sm text-[#aaa]">{TYPE_LABEL[t]}</span>
                  <span className="text-sm font-semibold text-[#e8e8f0]">{data.queue.queuedByType[t] || 0}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Audit feed */}
          <div className="bg-[#111118] border border-white/[0.08] rounded-2xl p-6">
            <div className="text-base font-semibold text-[#888] uppercase tracking-wider mb-4">Recent activity</div>
            {(!data.events || data.events.length === 0) ? <div className="text-sm text-[#555]">No events yet.</div> : (
              <div className="flex flex-col">
                {data.events.map((e) => (
                  <div key={e.id} className="flex items-center gap-3 py-2 border-b border-white/[0.04] last:border-0 text-sm">
                    <span className="inline-block w-2 h-2 rounded-full shrink-0" style={{ background: STATUS_COLOR[e.status] || "#8896a8" }} />
                    <span className="text-[#e8e8f0] font-medium w-24 shrink-0">{e.action}</span>
                    <span className="shrink-0 w-48 truncate">
                      <span className="text-[#a9b4c4]">{e.campaign_name || "—"}</span>
                      {e.user_email && <span className="text-[#555]"> · {e.user_email}</span>}
                    </span>
                    <span className="text-[#666] truncate flex-1">{e.message || (e.meta?.platform ? `[${e.meta.platform}]` : "")}</span>
                    <span className="text-[#555] shrink-0">{ago(e.created_at)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </AdminLayout>
  );
}
