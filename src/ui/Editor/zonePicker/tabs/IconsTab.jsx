/**
 * IconsTab.jsx
 * src/ui/Editor/zonePicker/tabs/IconsTab.jsx
 *
 * Two sections:
 *  - Phosphor search (Iconify API) — default, shows on search or browse
 *  - Local icon registry — always visible below as fallback
 */
import { useState, useEffect, useRef } from "react";
import { ICON_OPTIONS, ICON_GROUPS, renderIconSVG } from "../../../../core/iconRegistry.jsx";
import { searchIcons, fetchIconSVG } from "../../../../services/assets/iconifyService.js";

/* ── Phosphor icon tile — fetches its own SVG ── */
function PhosphorTile({ set, icon, onSelect }) {
  const [svg, setSvg] = useState(null);
  const id = `${set}:${icon}`;

  useEffect(() => {
    let cancelled = false;
    fetchIconSVG(set, icon, "#ffffff").then(s => { if (!cancelled) setSvg(s); });
    return () => { cancelled = true; };
  }, [set, icon]);

  return (
    <button
      onClick={() => onSelect({ kind: "icon", iconify: { set, icon }, defaults: { color: "#ffffff", opacity: 1 } })}
      title={icon}
      className="flex flex-col items-center justify-center gap-2 rounded-[10px] border border-[rgba(255,255,255,0.08)] bg-[#0e0e1a] hover:border-[#7c5cfc] hover:bg-[rgba(124,92,252,0.08)] transition-all cursor-pointer p-3 aspect-square"
    >
      <div className="w-10 h-10 flex items-center justify-center">
        {svg
          ? <div style={{ width: 40, height: 40 }} dangerouslySetInnerHTML={{ __html: svg }} />
          : <div className="w-6 h-6 rounded bg-white/10 animate-pulse" />
        }
      </div>
      <span className="text-[9px] font-mono text-[#9494a8] text-center leading-tight truncate w-full">
        {icon}
      </span>
    </button>
  );
}

export default function IconsTab({ onSelect }) {
  const [query,          setQuery]          = useState("");
  const [phosphorIcons,  setPhosphorIcons]  = useState([]);
  const [searching,      setSearching]      = useState(false);
  const [localGroup,     setLocalGroup]     = useState("all");
  const debounceRef = useRef(null);

  /* Search Phosphor on query change (debounced 400 ms) */
  useEffect(() => {
    clearTimeout(debounceRef.current);
    if (!query.trim()) {
      setPhosphorIcons([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    debounceRef.current = setTimeout(async () => {
      const results = await searchIcons(query.trim(), "ph", 48);
      setPhosphorIcons(results);
      setSearching(false);
    }, 400);
    return () => clearTimeout(debounceRef.current);
  }, [query]);

  /* Browse popular Phosphor icons when no query */
  useEffect(() => {
    if (query.trim()) return;
    // Pre-load a default browse set
    searchIcons("arrow", "ph", 24).then(r => setPhosphorIcons(r));
  }, []);

  const filteredLocal = localGroup === "all"
    ? ICON_OPTIONS
    : ICON_OPTIONS.filter(i => i.group === localGroup);

  return (
    <div className="flex flex-col gap-4">

      {/* Search bar */}
      <input
        type="text"
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="Search Phosphor icons…"
        className="w-full bg-[#12121c] border border-[rgba(255,255,255,0.08)] rounded-[8px] px-3 py-[8px] text-[13px] text-[#e8e8f0] focus:border-[#7c5cfc] focus:outline-none placeholder-[#55556a]"
      />

      {/* Phosphor results */}
      <div>
        <div className="text-[10px] font-bold tracking-widest uppercase text-[#7070a0] mb-2"
          style={{ fontFamily: "'JetBrains Mono', monospace" }}>
          {query.trim() ? `Phosphor — "${query}"` : "Phosphor — Browse"}
          {searching && <span className="ml-2 opacity-50">searching…</span>}
        </div>
        {phosphorIcons.length > 0 ? (
          <div className="grid grid-cols-6 gap-2">
            {phosphorIcons.map(({ set, icon }) => (
              <PhosphorTile key={`${set}:${icon}`} set={set} icon={icon} onSelect={onSelect} />
            ))}
          </div>
        ) : !searching && (
          <div className="text-[12px] text-[#55556a] py-2">No results — try a different term</div>
        )}
      </div>

      <div className="h-[1px] bg-[rgba(255,255,255,0.06)]" />

      {/* Local icon registry */}
      <div>
        <div className="text-[10px] font-bold tracking-widest uppercase text-[#7070a0] mb-2"
          style={{ fontFamily: "'JetBrains Mono', monospace" }}>
          Built-in Icons
        </div>
        <div className="flex gap-[5px] flex-wrap mb-3">
          {["all", ...ICON_GROUPS].map(g => (
            <button key={g} onClick={() => setLocalGroup(g)}
              className="px-3 py-[4px] rounded-[6px] text-[11px] font-bold border cursor-pointer capitalize transition-all"
              style={localGroup === g
                ? { background: "rgba(124,92,252,0.18)", borderColor: "#7c5cfc", color: "#a78bfa" }
                : { background: "transparent", borderColor: "rgba(255,255,255,0.08)", color: "#7070a0" }}
            >{g}</button>
          ))}
        </div>
        <div className="grid grid-cols-6 gap-2">
          {filteredLocal.map(icon => {
            const svg = renderIconSVG(icon.id, { color: "#ffffff", filled: icon.defaultFilled });
            return (
              <button
                key={icon.id}
                onClick={() => onSelect({ kind: "icon", iconId: icon.id, defaults: icon.defaults })}
                className="flex flex-col items-center justify-center gap-2 rounded-[10px] border border-[rgba(255,255,255,0.08)] bg-[#0e0e1a] hover:border-[#7c5cfc] hover:bg-[rgba(124,92,252,0.08)] transition-all cursor-pointer p-3 aspect-square"
              >
                <div className="w-10 h-10 flex items-center justify-center">
                  {svg
                    ? <svg viewBox={svg.viewBox} width="40" height="40" style={{ display: "block", overflow: "visible" }} dangerouslySetInnerHTML={{ __html: svg.content }} />
                    : <span className="text-[20px]">{icon.icon}</span>
                  }
                </div>
                <span className="text-[9px] font-mono text-[#9494a8] text-center leading-tight truncate w-full">
                  {icon.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

    </div>
  );
}
