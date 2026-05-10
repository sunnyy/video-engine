import { useState } from "react";
import RefundClaimModal from "./RefundClaimModal";

export default function RefundClaimTrigger({ service, projectId, creditsUsed }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        style={{
          background: "none",
          border: "none",
          padding: 0,
          cursor: "pointer",
          fontSize: 11,
          color: "#55556a",
          textDecoration: "none",
          fontFamily: "'Outfit', sans-serif",
        }}
        onMouseEnter={e => { e.currentTarget.style.textDecoration = "underline"; }}
        onMouseLeave={e => { e.currentTarget.style.textDecoration = "none"; }}
      >
        Report an issue
      </button>
      <RefundClaimModal
        isOpen={open}
        onClose={() => setOpen(false)}
        service={service}
        projectId={projectId}
        creditsUsed={creditsUsed}
      />
    </>
  );
}
