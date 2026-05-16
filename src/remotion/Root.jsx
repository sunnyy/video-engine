import { registerRoot, Composition } from "remotion";
import VideoComposition from "./VideoComposition";
import TimelineComposition from "./TimelineComposition";

const RemotionRoot = () => {

  return (
    <>
    <Composition
      id="VideoComposition"
      component={VideoComposition}
      durationInFrames={1}
      fps={30}
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
            fps: 30,
            width: 1080,
            height: 1920,
          };
        }

        const fps = project?.meta?.fps || 30;

        const totalDuration =
          project?.beats?.length
            ? project.beats[project.beats.length - 1].end_sec
            : 1;

        const durationInFrames = Math.max(
          1,
          Math.floor(totalDuration * fps)
        );

        const width =
          Number(project?.meta?.width) || 1080;

        const height =
          Number(project?.meta?.height) || 1920;

        return {
          durationInFrames,
          fps,
          width,
          height,
        };

      }}
    />

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