import React, { useMemo } from "react";
import { Video, useCurrentFrame } from "remotion";

export default function AvatarLayer({ avatar, project }) {
  const frame = useCurrentFrame();

  if (!avatar?.src || !project?.beats) return null;

  const fps = project.meta.fps;

  const currentBeat = useMemo(() => {
    return project.beats.find((beat) => {
      const start = Math.floor(beat.start_sec * fps);
      const end = Math.floor(beat.end_sec * fps);
      return frame >= start && frame < end;
    });
  }, [frame, project.beats, fps]);

  if (!currentBeat) return null;

  const { visual_mode, content_type } = currentBeat;
  const isVertical = project.meta.orientation === "9:16";
  const avatarOnTop = currentBeat.avatar_position !== "bottom";

  let containerStyle = {
    position: "absolute",
    width: "100%",
    height: "100%",
    opacity: 0,
  };

  if (visual_mode === "full" && content_type === "avatar") {
    containerStyle.opacity = 1;
  }

  if (visual_mode === "split") {
    containerStyle.opacity = 1;

    if (isVertical) {
      containerStyle = {
        ...containerStyle,
        top: avatarOnTop ? "0%" : "50%",
        left: 0,
        width: "100%",
        height: "50%",
      };
    } else {
      containerStyle = {
        ...containerStyle,
        top: 0,
        left: avatarOnTop ? "0%" : "50%",
        width: "50%",
        height: "100%",
      };
    }
  }

  if (visual_mode === "floating") {
    containerStyle = {
      position: "absolute",
      width: 300,
      height: 300,
      borderRadius: "50%",
      overflow: "hidden",
      bottom: 80,
      right: 80,
      boxShadow: "0 20px 40px rgba(0,0,0,0.6)",
      opacity: 1,
    };
  }

  const avatarFit = currentBeat.avatar_object_fit || "cover";

  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <div style={containerStyle}>
        <Video
          src={avatar.src}
          muted={false}
          style={{
            width: "100%",
            height: "100%",
            objectFit: avatarFit,
          }}
        />
      </div>
    </div>
  );
}