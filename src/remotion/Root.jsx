import { registerRoot, Composition } from "remotion";
import VideoComposition from "./VideoComposition";

const RemotionRoot = () => {
  return (
    <Composition
      id="VideoComposition"
      component={VideoComposition}
      durationInFrames={1}
      fps={25}
      width={1080}
      height={1920}
      defaultProps={{
        project: null,
      }}
      calculateMetadata={async ({ props }) => {
        const project = props.project;

        if (!project) {
          return {
            durationInFrames: 1,
            fps: 25,
            width: 1080,
            height: 1920,
          };
        }

        const fps = 25;
        const durationInFrames = Math.max(
          1,
          Math.floor((project.duration_sec || 1) * fps)
        );

        const width = Number(project?.meta?.width) || 1080;
        const height = Number(project?.meta?.height) || 1920;

        return {
          durationInFrames,
          fps,
          width,
          height,
        };
      }}
    />
  );
};

registerRoot(RemotionRoot);