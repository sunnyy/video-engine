export const captionStyleRegistry = {
  tiktokClean: () => ({
    container: {
      padding: "14px 22px",
      borderRadius: 18,
      backdropFilter: "blur(12px)",
      background: "rgba(0,0,0,0.35)",
    },
    word: {
      fontSize: 64,
      fontWeight: 800,
      color: "#ffffff",
      letterSpacing: "-0.5px",
      lineHeight: 1.2,
    },
    activeWord: {
      color: "#00F2EA", 
    },
  }),

  reelsBold: () => ({
    container: {},
    word: {
      fontSize: 70,
      fontWeight: 900,
      color: "#ffffff",
      letterSpacing: "-1px",
      lineHeight: 1.1,
      textShadow: "0 8px 30px rgba(0,0,0,0.6)",
    },
    activeWord: {
      color: "#ff0050", // Instagram pink
    },
  }),

  minimalGlass: () => ({
    container: {
      padding: "18px 30px",
      borderRadius: 22,
      background: "rgba(255,255,255,0.08)",
      backdropFilter: "blur(20px)",
      border: "1px solid rgba(255,255,255,0.15)",
    },
    word: {
      fontSize: 60,
      fontWeight: 700,
      color: "white",
      letterSpacing: "-0.3px",
    },
    activeWord: {
      color: "#FFD60A",
    },
  }),

  premiumBlock: () => ({
    container: {
      padding: "16px 24px",
      borderRadius: 14,
      background: "#000000",
    },
    word: {
      fontSize: 68,
      fontWeight: 900,
      color: "#ffffff",
      letterSpacing: "-0.5px",
    },
    activeWord: {
      background: "#ffffff",
      color: "#000000",
      padding: "2px 8px",
      borderRadius: 6,
    },
  }),

  kineticPop: () => ({
    container: {},
    word: {
      fontSize: 72,
      fontWeight: 900,
      color: "#ffffff",
      letterSpacing: "-1px",
      lineHeight: 1.05,
    },
    activeWord: {
      color: "#ffcc00",
      transform: "scale(1.08)",
      display: "inline-block",
    },
  }),

  cinematicSubtitle: () => ({
    container: {
      padding: "10px 20px",
      borderRadius: 8,
      background: "rgba(0,0,0,0.75)",
    },
    word: {
      fontSize: 46,
      fontWeight: 600,
      color: "#ffffff",
      letterSpacing: "1px",
      textTransform: "uppercase",
    },
    activeWord: {
      color: "#FFD700",
    },
  }),
};