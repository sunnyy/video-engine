export const captionStyleRegistry = {

  tiktokClean: (brandColor = "#00F2EA") => ({
    container: {
      padding: "14px 22px",
      borderRadius: 18,
      backdropFilter: "blur(12px)",
      background: "rgba(0,0,0,0.35)",
    },
    word: {
      fontFamily: "Inter, sans-serif",
      margin: "0 10px",
      fontSize: 44,
      fontWeight: 800,
      color: "#ffffff",
      letterSpacing: "-0.5px",
      lineHeight: 1.2,
      textAlign: "justify"
    },
    activeWord: {
      color: brandColor,
    },
  }),

  reelsBold: (brandColor = "#ff0050") => ({
    container: {},
    word: {
      fontFamily: "Oswald, sans-serif",
      margin: "0 10px",
      fontSize: 50,
      fontWeight: 900,
      color: "#ffffff",
      letterSpacing: "-1px",
      lineHeight: 1.1,
      textShadow: "0 8px 30px rgba(0,0,0,0.6)",
    },
    activeWord: {
      color: brandColor,
    },
  }),

  minimalGlass: (brandColor = "#FFD60A") => ({
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
      fontSize: 40,
      fontWeight: 600,
      color: "white",
      letterSpacing: "-0.3px",
    },
    activeWord: {
      color: brandColor,
    },
  }),

  premiumBlock: (brandColor = "#ffffff") => ({
    container: {
      padding: "16px 24px",
      borderRadius: 14,
      background: "#000000",
    },
    word: {
      fontFamily: "Montserrat, sans-serif",
      margin: "0 10px",
      fontSize: 48,
      fontWeight: 800,
      color: "#ffffff",
      letterSpacing: "-0.5px",
    },
    activeWord: {
      background: brandColor,
      color: "#000000",
      padding: "2px 8px",
      borderRadius: 6,
    },
  }),

  kineticPop: (brandColor = "#ffcc00") => ({
    container: {},
    word: {
      fontFamily: "Rubik, sans-serif",
      fontSize: 42,
      fontWeight: 900,
      color: "#ffffff",
      letterSpacing: "-1px",
      lineHeight: 1.05,
    },
    activeWord: {
      color: brandColor,
      transform: "scale(1.08)",
      display: "inline-block",
      margin: "0 20px",
    },
  }),

  cinematicSubtitle: (brandColor = "#FFD700") => ({
    container: {
      padding: "10px 20px",
      borderRadius: 8,
      background: "rgba(0,0,0,0.75)",
    },
    word: {
      fontFamily: "Playfair Display, serif",
      fontSize: 36,
      margin: "0 10px",
      fontWeight: 600,
      color: "#ffffff",
      letterSpacing: "1px",
      textTransform: "uppercase",
    },
    activeWord: {
      color: brandColor,
    },
  }),

  neonPulse: (brandColor = "#00ffff") => ({
    container: {},
    word: {
      fontFamily: "Anton, sans-serif",
      margin: "0 10px",
      fontSize: 48,
      fontWeight: 400,
      color: "#ffffff",
      letterSpacing: "1px",
      textShadow: "0 0 10px rgba(0,255,255,0.6), 0 0 20px rgba(0,255,255,0.4)",
    },
    activeWord: {
      color: brandColor,
      textShadow: `0 0 18px ${brandColor}, 0 0 40px ${brandColor}`,
    },
  }),

  luxuryGold: (brandColor = "#FFD700") => ({
    container: {},
    word: {
      fontFamily: "Playfair Display, serif",
      margin: "0 10px",
      fontSize: 46,
      fontWeight: 700,
      background: "linear-gradient(90deg,#C6A75E,#F5E6B3,#C6A75E)",
      WebkitBackgroundClip: "text",
      WebkitTextFillColor: "transparent",
      letterSpacing: "-1px",
    },
    activeWord: {
      background: `linear-gradient(90deg,${brandColor},#FFF4C2,${brandColor})`,
      WebkitBackgroundClip: "text",
      WebkitTextFillColor: "transparent",
    },
  }),

  brutalImpact: (brandColor = "#ff2d55") => ({
    container: {},
    word: {
      fontFamily: "Anton, sans-serif",
      margin: "0 10px",
      fontSize: 52,
      fontWeight: 400,
      color: "#ffffff",
      letterSpacing: "-2px",
      WebkitTextStroke: "2px black",
    },
    activeWord: {
      color: brandColor,
      WebkitTextStroke: "2px #000000",
    },
  }),

  glassHighlight: (brandColor = "#ffffff") => ({
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
      fontSize: 42,
      fontWeight: 600,
      color: "#ffffff",
      letterSpacing: "-0.3px",
    },
    activeWord: {
      background: brandColor,
      padding: "4px 10px",
      borderRadius: 12,
      color: "#000",
    },
  }),

};