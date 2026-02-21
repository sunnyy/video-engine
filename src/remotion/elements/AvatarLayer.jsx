import React from "react";
import { AbsoluteFill, Video, Img } from "remotion";

export default function AvatarLayer({ avatar }) {
  if (!avatar?.src) {
    return (
      <AbsoluteFill
        style={{
          background: "linear-gradient(135deg, #333, #111)",
        }}
      />
    );
  }

  const isVideo =
    avatar.src.endsWith(".mp4") ||
    avatar.src.endsWith(".webm") ||
    avatar.src.endsWith(".mov");

  return (
    <AbsoluteFill>
      {isVideo ? (
        <Video
          src={avatar.src}
          playbackRate={avatar.speed || 1}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
        />
      ) : (
        <Img
          src={avatar.src}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
        />
      )}
    </AbsoluteFill>
  );
}