/**
 * AdminDashboard.jsx
 * Overview stats — user count, project count, recent signups.
 */
import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import AdminLayout from "./AdminLayout";

const supabaseAdmin = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

function StatCard({ label, value, color = "#7c5cfc" }) {
  return (
    <div className="bg-[#111118] border border-white/[0.08] rounded-xl px-7 py-6 min-w-[160px]">
      <div className="text-base text-[#aaa] mb-2">{label}</div>
      <div className="text-5xl font-bold" style={{ color }}>{value ?? "—"}</div>
    </div>
  );
}

export default function AdminDashboard() {
  const [stats, setStats] = useState({ users: null, projects: null });
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [{ count: projects }, { data: recentProjects }] = await Promise.all([
          supabaseAdmin.from("projects").select("*", { count: "exact", head: true }),
          supabaseAdmin.from("projects").select("id, title, created_at, user_id").order("created_at", { ascending: false }).limit(10),
        ]);
        setStats(s => ({ ...s, projects }));
        setRecent(recentProjects || []);
      } catch (e) {
        console.error("[admin] Dashboard load failed:", e.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <AdminLayout>
      <h1 className="text-4xl font-bold mb-2">Dashboard</h1>
      <p className="text-[#aaa] text-lg mb-10">Overview of your Video Engine instance.</p>

      {loading ? (
        <div className="text-[#888] text-lg">Loading...</div>
      ) : (
        <>
          <div className="flex gap-4 mb-12 flex-wrap">
            <StatCard label="Total Projects" value={stats.projects} />
            <StatCard label="Users" value="—" color="#3b9eff" />
            <StatCard label="Renders Today" value="—" color="#f97316" />
          </div>

          <h2 className="text-xl font-semibold mb-4 text-[#ccc]">Recent Projects</h2>
          <table className="w-full border-collapse text-base">
            <thead>
              <tr className="border-b border-white/[0.08] text-[#888] text-left">
                <th className="px-3 py-2">Title</th>
                <th className="px-3 py-2">User ID</th>
                <th className="px-3 py-2">Created</th>
              </tr>
            </thead>
            <tbody>
              {recent.map(p => (
                <tr key={p.id} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                  <td className="px-3 py-3 text-[#e8e8f0]">{p.title || "Untitled"}</td>
                  <td className="px-3 py-3 text-[#888] font-mono text-sm">{p.user_id?.slice(0, 8)}…</td>
                  <td className="px-3 py-3 text-[#888]">{new Date(p.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
              {recent.length === 0 && (
                <tr><td colSpan={3} className="px-3 py-6 text-[#555]">No projects found.</td></tr>
              )}
            </tbody>
          </table>
        </>
      )}
    </AdminLayout>
  );
}
