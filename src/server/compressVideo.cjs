const ffmpeg = require("fluent-ffmpeg");
const ffmpegPath = require("ffmpeg-static");

ffmpeg.setFfmpegPath(ffmpegPath);

function compressVideo(inputPath, outputPath) {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .videoCodec("libx264")
      .outputOptions([
        "-preset veryfast",
        "-crf 26",
        "-vf scale=1280:-2",
        "-profile:v baseline",
        "-level 3.0",
        "-pix_fmt yuv420p",
        "-movflags +faststart",
      ])
      .audioCodec("aac")
      .audioBitrate("128k")
      .audioChannels(2)
      .on("end", resolve)
      .on("error", reject)
      .save(outputPath);
  });
}

module.exports = compressVideo;
