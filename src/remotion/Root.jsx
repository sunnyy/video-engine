import { registerRoot, Composition } from "remotion";
import TimelineComposition from "./TimelineComposition";

const RemotionRoot = () => {

  return (
    <>
    <Composition
      id="TimelineComposition"
      component={TimelineComposition}
      fps={30}
      width={1080}
      height={1920}
      durationInFrames={900}
      defaultProps={{ project: {} }}
      calculateMetadata={({ props }) => {
        const fmt = props.project?.format || {};
        return {
          fps: fmt.fps || 30,
          width: fmt.width || 1080,
          height: fmt.height || 1920,
          durationInFrames: Math.max(1, Math.round((fmt.duration || 30) * (fmt.fps || 30))),
        };
      }}
    />
    </>
  );

};

registerRoot(RemotionRoot);