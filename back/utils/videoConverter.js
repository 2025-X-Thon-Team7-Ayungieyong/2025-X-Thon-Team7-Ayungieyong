const { execFile } = require("child_process");
const path = require("path");
const fs = require("fs");
const { promisify } = require("util");
const ffmpegPath = require("ffmpeg-static");
const execFileAsync = promisify(execFile);

function buildOutputPaths(inputPath) {
  const dir = path.dirname(inputPath);
  const base = path.basename(inputPath, path.extname(inputPath));
  return {
    mp4: path.join(dir, `${base}.mp4`),
    wav: path.join(dir, `${base}.wav`),
  };
}

async function convertWebmToMp4AndWav(inputAbsolutePath) {
  const { mp4, wav } = buildOutputPaths(inputAbsolutePath);

  // webm -> mp4 (영상+음성)
  await execFileAsync(ffmpegPath || "ffmpeg", [
    "-y",
    "-i",
    inputAbsolutePath,
    "-c:v",
    "libx264",
    "-c:a",
    "aac",
    mp4,
  ]);

  // webm -> wav (오디오 추출)
  await execFileAsync(ffmpegPath || "ffmpeg", [
    "-y",
    "-i",
    inputAbsolutePath,
    "-vn",
    "-acodec",
    "pcm_s16le",
    "-ar",
    "16000",
    "-ac",
    "1",
    wav,
  ]);

  const projectRoot = path.join(__dirname, "..");
  const toRelative = (p) =>
    `/${path.relative(projectRoot, p).replace(/\\/g, "/")}`;

  return {
    outputMp4Relative: toRelative(mp4),
    outputWavRelative: toRelative(wav),
    detectedDuration: null, // 필요 시 ffprobe로 채우기
  };
}

module.exports = { convertWebmToMp4AndWav };
