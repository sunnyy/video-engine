/**
 * AdminLayout.jsx
 * Shared sidebar + header shell for all admin pages.
 */
import { NavLink, useNavigate } from "react-router-dom";

const NAV = [
  { to: "/admin",         label: "Dashboard",     icon: "▦" },
  { to: "/admin/users",   label: "Users",          icon: "◎" },
  { to: "/admin/layouts", label: "Layout Manager", icon: "⊞" },
  { to: "/admin/library", label: "Image Library",  icon: "⊟" },
];

export default function AdminLayout({ children, fullBleed = false }) {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen bg-[#0d0d14] text-white font-sans">

      {/* Sidebar */}
      <aside className="w-[220px] bg-[#111118] border-r border-white/[0.06] flex flex-col py-6 shrink-0">
        <div className="px-5 pb-6 border-b border-white/[0.06]">
          <div className="text-[11px] font-bold tracking-[2px] text-[#7c5cfc] uppercase">Admin</div>
          <div className="text-lg font-bold mt-1">Video Engine</div>
        </div>

        <nav className="flex-1 p-3 flex flex-col gap-1">
          {NAV.map(({ to, label, icon }) => (
            <NavLink key={to} to={to} end={to === "/admin"}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium no-underline transition-colors
                 ${isActive
                   ? "text-white bg-[#7c5cfc]/15 border-l-[3px] border-[#7c5cfc]"
                   : "text-[#888] border-l-[3px] border-transparent hover:text-white hover:bg-white/5"
                 }`
              }>
              <span className="text-base">{icon}</span>
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="px-5 pt-4 border-t border-white/[0.06]">
          <button onClick={() => navigate("/")}
            className="w-full py-2 bg-white/5 border border-white/10 rounded-lg text-[#aaa] text-sm cursor-pointer hover:bg-white/10 transition-colors">
            ← Back to App
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className={`flex-1 ${fullBleed ? "overflow-hidden p-0" : "overflow-auto p-8"}`}>
        {children}
      </main>

    </div>
  );
}
