const ffmpeg = require("fluent-ffmpeg");
const ffmpegPath = require("ffmpeg-static");

ffmpeg.setFfmpegPath(ffmpegPath);

function compressAudio(inputPath, outputPath) {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .audioCodec("aac")
      .audioBitrate("128k")
      .audioChannels(2)
      .outputOptions([
        "-movflags +faststart",
      ])
      .on("end", resolve)
      .on("error", reject)
      .save(outputPath);
  });
}

module.exports = compressAudio;