export const captionStyleRegistry = {
  tiktokClean: () => ({
    container: {
      padding: "14px 22px",
      borderRadius: 18,
      backdropFilter: "blur(12px)",
      background: "rgba(0,0,0,0.35)",
    },
    word: {
      fontFamily: "Inter, sans-serif",
      margin: "0 10px",
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
      fontFamily: "Oswald, sans-serif",
      margin: "0 10px",
      fontSize: 70,
      fontWeight: 900,
      color: "#ffffff",
      letterSpacing: "-1px",
      lineHeight: 1.1,
      textShadow: "0 8px 30px rgba(0,0,0,0.6)",
    },
    activeWord: {
      color: "#ff0050",
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
      fontFamily: "Poppins, sans-serif",
      margin: "0 10px",
      fontSize: 60,
      fontWeight: 600,
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
      fontFamily: "Montserrat, sans-serif",
      margin: "0 10px",
      fontSize: 68,
      fontWeight: 800,
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
      fontFamily: "Rubik, sans-serif",
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
      margin: "0 20px",
    },
  }),

  cinematicSubtitle: () => ({
    container: {
      padding: "10px 20px",
      borderRadius: 8,
      background: "rgba(0,0,0,0.75)",
    },
    word: {
      fontFamily: "Playfair Display, serif",
      fontSize: 46,
      margin: "0 10px",
      fontWeight: 600,
      color: "#ffffff",
      letterSpacing: "1px",
      textTransform: "uppercase",
    },
    activeWord: {
      color: "#FFD700",
    },
  }),

  neonPulse: () => ({
    container: {},
    word: {
      fontFamily: "Anton, sans-serif",
      margin: "0 10px",
      fontSize: 68,
      fontWeight: 400,
      color: "#ffffff",
      letterSpacing: "1px",
      textShadow: "0 0 10px rgba(0,255,255,0.6), 0 0 20px rgba(0,255,255,0.4)",
    },
    activeWord: {
      color: "#00ffff",
      textShadow: "0 0 18px #00ffff, 0 0 40px #00ffff",
    },
  }),

  luxuryGold: () => ({
    container: {},
    word: {
      fontFamily: "Playfair Display, serif",
      margin: "0 10px",
      fontSize: 66,
      fontWeight: 700,
      background: "linear-gradient(90deg,#C6A75E,#F5E6B3,#C6A75E)",
      WebkitBackgroundClip: "text",
      WebkitTextFillColor: "transparent",
      letterSpacing: "-1px",
    },
    activeWord: {
      background: "linear-gradient(90deg,#FFD700,#FFF4C2,#FFD700)",
      WebkitBackgroundClip: "text",
      WebkitTextFillColor: "transparent",
    },
  }),

  brutalImpact: () => ({
    container: {},
    word: {
      fontFamily: "Anton, sans-serif",
      margin: "0 10px",
      fontSize: 82,
      fontWeight: 400,
      color: "#ffffff",
      letterSpacing: "-2px",
      WebkitTextStroke: "2px black",
    },
    activeWord: {
      color: "#ff2d55",
      WebkitTextStroke: "2px #000000",
    },
  }),

  glassHighlight: () => ({
    container: {
      padding: "20px 28px",
      borderRadius: 28,
      background: "rgba(255,255,255,0.05)",
      backdropFilter: "blur(30px)",
      border: "1px solid rgba(255,255,255,0.12)",
    },
    word: {
      fontFamily: "Poppins, sans-serif",
      margin: "0 10px",
      fontSize: 62,
      fontWeight: 600,
      color: "#ffffff",
      letterSpacing: "-0.3px",
    },
    activeWord: {
      background: "rgba(255,255,255,0.2)",
      padding: "4px 10px",
      borderRadius: 12,
    },
  }),

  viralGradient: () => ({
    container: {},
    word: {
      fontFamily: "Bebas Neue, sans-serif",
      margin: "0 10px",
      fontSize: 74,
      fontWeight: 400,
      background: "linear-gradient(90deg,#ff0050,#ff8a00,#ffd000)",
      WebkitBackgroundClip: "text",
      WebkitTextFillColor: "transparent",
      letterSpacing: "1px",
    },
    activeWord: {
      background: "linear-gradient(90deg,#00F2EA,#00ff95)",
      WebkitBackgroundClip: "text",
      WebkitTextFillColor: "transparent",
    },
  }),

  softMinimal: () => ({
    container: {},
    word: {
      fontFamily: "Inter, sans-serif",
      margin: "0 10px",
      fontSize: 58,
      fontWeight: 500,
      color: "#f1f1f1",
      letterSpacing: "-0.2px",
      lineHeight: 1.3,
    },
    activeWord: {
      color: "#ffffff",
      fontWeight: 800,
    },
  }),

  modernOutline: () => ({
    container: {},
    word: {
      fontFamily: "Montserrat, sans-serif",
      margin: "0 10px",
      fontSize: 72,
      fontWeight: 800,
      color: "transparent",
      WebkitTextStroke: "1.8px #ffffff",
      letterSpacing: "-1px",
    },
    activeWord: {
      color: "#ffffff",
      WebkitTextStroke: "0px",
    },
  }),

  highContrastFlash: () => ({
    container: {},
    word: {
      fontFamily: "Anton, sans-serif",
      margin: "0 5px 5px",
      fontSize: 58,
      fontWeight: 400,
      color: "#000000",
      background: "#ffffff",
      padding: "2px 6px",
    },
    activeWord: {
      background: "#ff0000",
      color: "#ffffff",
    },
  }),
};
