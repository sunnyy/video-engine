import AppLayout from "../ui/AppLayout";
import BrandKitPanel from "../ui/BrandKitPanel";

/**
 * BrandKit — standalone page at /brand-kit (linked from AppLayout). The form itself lives in
 * the shared BrandKitPanel so the Automation "Brand Kit" tab can reuse it.
 */

const T = { bg: "#090b11", text: "#e8eaf0", muted: "#8896a8" };

export default function BrandKit() {
  return (
    <AppLayout>
      <div style={{ flex: 1, overflowY: "auto", background: T.bg }}>
        <div style={{ maxWidth: 620, margin: "0 auto", padding: "44px 24px 80px" }}>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: T.text, fontFamily: "'Outfit',sans-serif", margin: "0 0 6px" }}>Brand Kit</h1>
          <p style={{ fontSize: 14, color: T.muted, marginTop: 0, marginBottom: 26 }}>
            Your logo and channel details get added to generated videos — a logo mark and a closing call-to-action.
          </p>
          <BrandKitPanel />
        </div>
      </div>
    </AppLayout>
  );
}
