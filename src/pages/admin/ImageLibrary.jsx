/**
 * ImageLibrary.jsx
 * Browse and manage uploaded assets stored in Supabase Storage.
 * Future: delete, re-tag, bulk-promote to stock library.
 */
import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import AdminLayout from "./AdminLayout";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

const BUCKET = "user-assets";

export default function ImageLibrary() {
  const [assets, setAssets]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage]       = useState(0);
  const PAGE_SIZE = 48;

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const { data } = await supabase
          .from("user_assets")
          .select("id, url, file_type, created_at, user_id")
          .order("created_at", { ascending: false })
          .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
        setAssets(data || []);
      } catch (e) {
        console.error("[admin] ImageLibrary load failed:", e.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [page]);

  const prevDisabled = page === 0;
  const nextDisabled = assets.length < PAGE_SIZE;

  return (
    <AdminLayout>
      <h1 className="text-4xl font-bold mb-2">Image Library</h1>
      <p className="text-[#aaa] text-lg mb-6">
        All user-uploaded assets from the{" "}
        <code className="text-[#7c5cfc]">{BUCKET}</code> bucket.
      </p>

      {loading ? (
        <div className="text-[#888] text-lg">Loading...</div>
      ) : (
        <>
          <div className="grid gap-3 mb-6" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))" }}>
            {assets.map(a => (
              <div key={a.id} className="bg-[#111118] border border-white/[0.06] rounded-xl overflow-hidden">
                {a.file_type?.startsWith("image") ? (
                  <img src={a.url} alt="" className="w-full aspect-square object-cover block" loading="lazy" />
                ) : (
                  <div className="w-full aspect-square bg-[#1a1a26] flex items-center justify-center text-[#666] text-3xl">
                    {a.file_type?.startsWith("video") ? "▶" : "♫"}
                  </div>
                )}
                <div className="px-2.5 py-2">
                  <div className="text-xs text-[#888] font-mono">{a.user_id?.slice(0, 8)}…</div>
                  <div className="text-xs text-[#666]">{new Date(a.created_at).toLocaleDateString()}</div>
                </div>
              </div>
            ))}
            {assets.length === 0 && (
              <div className="col-span-full text-[#555] py-5 text-base">No assets found.</div>
            )}
          </div>

          <div className="flex gap-3 items-center">
            <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={prevDisabled}
              className={`px-4 py-2 bg-white/[0.06] border border-white/10 rounded-lg text-base transition-colors
                ${prevDisabled ? "text-[#555] cursor-default" : "text-white cursor-pointer hover:bg-white/10"}`}>
              ← Prev
            </button>
            <span className="text-[#888] text-base">Page {page + 1}</span>
            <button onClick={() => setPage(p => p + 1)} disabled={nextDisabled}
              className={`px-4 py-2 bg-white/[0.06] border border-white/10 rounded-lg text-base transition-colors
                ${nextDisabled ? "text-[#555] cursor-default" : "text-white cursor-pointer hover:bg-white/10"}`}>
              Next →
            </button>
          </div>
        </>
      )}
    </AdminLayout>
  );
}
