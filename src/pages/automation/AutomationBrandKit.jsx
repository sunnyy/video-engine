import BrandKitPanel from "../../ui/BrandKitPanel";
import UpgradeGate from "../../ui/UpgradeGate";
import { usePlanStore } from "../../store/usePlanStore";

/**
 * Automation → Brand Kit tab. Logo + CTA applied to generated videos (shared BrandKitPanel).
 * Pro/Agency only.
 */
const T = { surface: "#0e1018", border: "rgba(255,255,255,0.08)" };

export default function AutomationBrandKit() {
  const { isProPlus, loaded } = usePlanStore();
  if (loaded && !isProPlus) return <UpgradeGate feature="Brand Kit" blurb="The Brand Kit — your logo + CTA auto-applied to generated videos — is available on the Pro and Agency plans." />;
  return (
    <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, padding: 20 }}>
      <BrandKitPanel />
    </div>
  );
}
