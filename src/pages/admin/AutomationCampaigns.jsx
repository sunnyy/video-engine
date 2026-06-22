/**
 * AutomationCampaigns.jsx — admin oversight of every user's automation campaigns. Tabular
 * list with search (campaign name / id / owner email) + status filter, inline pause/stop,
 * and a detail panel (videos + activity) for the selected campaign.
 */
import { useEffect, useState, useRef } from "react";
import AdminLayout from "./AdminLayout";
import { serverFetch } from "../../services/serverApi";

async function safeJson(res) {
  const text = await res.text();
  if (!res.ok) throw new Error(`Server ${res.status}: ${text.slice(0, 120)}`);
  try { return JSON.parse(text); } catch { throw new Error("Invalid server response"); }
}

const STATUS = { draft: "#8896a8", active: "#22c55e", paused: "#f59e0b", stopped: "#f87171" };
const STAGE = { generate_video: "Generating", render_timeline: "Rendering", publish_post: "Publishing" };
const POST_COLOR = { awaiting_approval: "#f59e0b", queued: "#8896a8", running: "#38bdf8", published: "#22c55e", failed: "#f87171" };
const ago = (iso) => { if (!iso) return ""; const s = Math.floor((Date.now() - new Date(iso)) / 1000); return s < 60 ? `${s}s ago` : s < 3600 ? `${Math.floor(s / 60)}m ago` : s < 86400 ? `${Math.floor(s / 3600)}h ago` : `${Math.floor(s / 86400)}d ago`; };

function Pill({ status }) {
  const c = STATUS[status] || "#8896a8";
  return <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ color: c, background: `${c}22` }}>{status}</span>;
}

export default function AutomationCampaigns() {
  const [campaigns, setCampaigns] = useState(null);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [busy, setBusy] = useState("");
  const timer = useRef(null);

  const load = async () => {
    try { setCampaigns((await safeJson(await serverFetch("/api/automation/admin/campaigns"))).campaigns || []); setError(""); }
    catch (e) { setError(e.message); }
  };
  useEffect(() => { load(); timer.current = setInterval(load, 15_000); return () => clearInterval(timer.current); }, []);

  const openDetail = async (id) => {
    setSelected(id); setDetail(null);
    try { setDetail(await safeJson(await serverFetch(`/api/automation/admin/campaigns/${id}`))); }
    catch (e) { setError(e.message); }
  };

  const control = async (id, action) => {
    setBusy(id + action);
    try { await serverFetch(`/api/automation/admin/campaigns/${id}/${action}`, { method: "POST" }); await load(); if (selected === id) await openDetail(id); }
    catch (e) { setError(e.message); } finally { setBusy(""); }
  };

  const q = search.trim().toLowerCase();
  const filtered = (campaigns || []).filter((c) => {
    if (statusFilter !== "all" && c.status !== statusFilter) return false;
    if (!q) return true;
    return (c.name || "").toLowerCase().includes(q) || (c.id || "").toLowerCase().includes(q) || (c.user_email || "").toLowerCase().includes(q) || (c.user_id || "").toLowerCase().includes(q);
  });

  const inputCls = "bg-white/[0.05] border border-white/[0.08] rounded-lg text-sm text-white px-3 py-2 outline-none focus:border-[#7c5cfc]/60";
  const th = "py-2.5 px-3 font-semibold text-[11px] uppercase tracking-wider text-[#666]";
  const td = "py-3 px-3 align-middle";

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-1 gap-4 flex-wrap">
        <h1 className="text-4xl font-bold">Automation Campaigns</h1>
        <button onClick={load} className="px-4 py-2 bg-white/[0.05] border border-white/[0.08] rounded-lg text-[#888] text-sm cursor-pointer hover:text-white hover:bg-white/10 transition-colors">↻ Refresh</button>
      </div>
      <p className="text-[#888] text-lg mb-6">Every user's campaigns. Search, filter, pause/stop, and click a row for its videos and activity. Auto-refreshes every 15s.</p>

      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by campaign, id, or owner…" className={`${inputCls} w-80 max-w-full`} />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={inputCls}>
          <option value="all" className="bg-[#111118]">All statuses</option>
          <option value="draft" className="bg-[#111118]">Draft</option>
          <option value="active" className="bg-[#111118]">Active</option>
          <option value="paused" className="bg-[#111118]">Paused</option>
          <option value="stopped" className="bg-[#111118]">Stopped</option>
        </select>
        <span className="text-sm text-[#555] ml-auto">{filtered.length} of {campaigns?.length || 0}</span>
      </div>

      {error && <div className="bg-[#f97316]/10 border border-[#f97316]/30 rounded-xl px-5 py-4 text-[#f97316] text-sm mb-6">{error}</div>}

      {!campaigns ? <div className="text-[#666] text-xl animate-pulse">Loading…</div>
        : (
          <div className="bg-[#111118] border border-white/[0.08] rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b border-white/[0.08]">
                  <th className={th}>Campaign</th>
                  <th className={th}>Owner</th>
                  <th className={th}>Status</th>
                  <th className={th}>Niche</th>
                  <th className={`${th} text-center`}>Posts/day</th>
                  <th className={`${th} text-center`}>Published</th>
                  <th className={`${th} text-center`}>Queued</th>
                  <th className={`${th} text-right`}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={8} className="py-8 text-center text-[#555]">No campaigns match.</td></tr>
                ) : filtered.map((c) => (
                  <tr key={c.id} onClick={() => openDetail(c.id)}
                    className={`border-b border-white/[0.04] last:border-0 cursor-pointer transition-colors ${selected === c.id ? "bg-[#7c5cfc]/10" : "hover:bg-white/[0.03]"}`}>
                    <td className={`${td} font-semibold text-white`}>{c.name}</td>
                    <td className={`${td} text-[#888] max-w-[200px] truncate`}>{c.user_email || c.user_id}</td>
                    <td className={td}><Pill status={c.status} /></td>
                    <td className={`${td} text-[#aaa] max-w-[200px] truncate`}>{(c.niches || []).join(", ") || "—"}</td>
                    <td className={`${td} text-center text-[#aaa]`}>{c.posts_per_day || 1}</td>
                    <td className={`${td} text-center text-[#aaa]`}>{c.counts?.published || 0}</td>
                    <td className={`${td} text-center text-[#aaa]`}>{c.queued || 0}</td>
                    <td className={`${td} text-right`} onClick={(e) => e.stopPropagation()}>
                      <div className="inline-flex gap-2">
                        {c.status === "active" && <button onClick={() => control(c.id, "pause")} disabled={busy === c.id + "pause"} className="px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer border border-white/15 text-[#f59e0b] bg-transparent hover:bg-white/5">Pause</button>}
                        {(c.status === "active" || c.status === "paused") && <button onClick={() => control(c.id, "stop")} disabled={busy === c.id + "stop"} className="px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer border border-white/15 text-[#f87171] bg-transparent hover:bg-white/5">Stop</button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      {/* Detail panel */}
      {selected && (
        <div className="bg-[#111118] border border-white/[0.08] rounded-2xl p-5 mt-5">
          {!detail ? <div className="text-[#666] animate-pulse">Loading…</div> : (
            <>
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <div className="flex items-center gap-2.5">
                    <span className="text-lg font-bold text-white">{detail.campaign.name}</span>
                    <Pill status={detail.campaign.status} />
                  </div>
                  <div className="text-xs text-[#888] mt-1">{detail.campaign.user_email || detail.campaign.user_id || ""}</div>
                  <div className="text-[11px] text-[#555] mt-0.5 font-mono">{detail.campaign.id}</div>
                  <div className="text-xs text-[#888] mt-1">{(detail.campaign.niches || []).join(", ") || "no niche"} · {detail.queued} topics queued</div>
                </div>
                <button onClick={() => { setSelected(null); setDetail(null); }} className="text-[#666] hover:text-white text-sm cursor-pointer">✕ Close</button>
              </div>

              <div className="grid gap-6" style={{ gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)" }}>
                <div>
                  <div className="text-xs font-bold text-[#888] uppercase tracking-wider mb-2">Videos</div>
                  {detail.active.length === 0 && detail.posts.length === 0 && <div className="text-sm text-[#555]">Nothing yet.</div>}
                  {detail.active.map((j) => (
                    <div key={j.id} className="flex items-center justify-between py-1.5 text-sm border-b border-white/[0.04]">
                      <span className="text-[#38bdf8]">● {STAGE[j.type] || j.type}{j.type === "render_timeline" && j.progress ? ` ${j.progress}%` : ""}</span>
                      <span className="text-[#666] text-xs">{j.status}</span>
                    </div>
                  ))}
                  {detail.posts.map((p) => (
                    <div key={p.id} className="flex items-center justify-between py-1.5 text-sm border-b border-white/[0.04]">
                      <span style={{ color: "#e8e8f0" }}><span style={{ color: POST_COLOR[p.status] || "#666" }}>●</span> {p.platform} <span className="text-[#666]">{p.status.replace("_", " ")}</span></span>
                      {p.platform_post_id && p.platform === "youtube" && <a href={`https://youtu.be/${p.platform_post_id}`} target="_blank" rel="noreferrer" className="text-[#7c5cfc] text-xs">view ↗</a>}
                    </div>
                  ))}
                </div>
                <div>
                  <div className="text-xs font-bold text-[#888] uppercase tracking-wider mb-2">Activity</div>
                  {detail.events.length === 0 ? <div className="text-sm text-[#555]">No activity.</div>
                    : detail.events.slice(0, 20).map((e) => (
                      <div key={e.id} className="flex items-center gap-2 py-1 text-xs">
                        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: POST_COLOR[e.status] || (e.status === "ok" ? "#22c55e" : e.status === "fail" ? "#f87171" : "#8896a8") }} />
                        <span className="text-white font-semibold w-20 shrink-0">{e.action}</span>
                        <span className="text-[#666] flex-1 truncate">{e.message || e.entity || ""}</span>
                        <span className="text-[#555] shrink-0">{ago(e.created_at)}</span>
                      </div>
                    ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </AdminLayout>
  );
}
