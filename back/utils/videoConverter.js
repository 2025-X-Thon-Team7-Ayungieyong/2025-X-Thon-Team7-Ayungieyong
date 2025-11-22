const { execFile } = require("child_process");
const path = require("path");
const fs = require("fs");
const { promisify } = require("util");
const execFileAsync = promisify(execFile);

function buildOutputPath(inputPath) {
  const dir = path.dirname(inputPath);
  const base = path.basename(inputPath, path.extname(inputPath));
  return path.join(dir, `${base}.mp4`);
}

async function convertWebmToMp4(inputAbsolutePath) {
  const outputAbsolute = buildOutputPath(inputAbsolutePath);
  // ffmpeg -y -i input.webm -c:v libx264 -c:a aac output.mp4
  await execFileAsync("ffmpeg", [
    "-y",
    "-i",
    inputAbsolutePath,
    "-c:v",
    "libx264",
    "-c:a",
    "aac",
    outputAbsolute,
  ]);

  // 상대 경로(프로젝트 기준)로 변환
  const projectRoot = path.join(__dirname, "..");
  const outputRelative = path
    .relative(projectRoot, outputAbsolute)
    .replace(/\\/g, "/");
  const extractedAudioPath = null; // 필요 시 -vn 옵션으로 별도 추출 가능

  // 길이 파싱은 ffprobe를 쓰거나 호출부에서 별도 처리
  const detectedDuration = null;

  return {
    outputRelative: `/${outputRelative}`,
    detectedDuration,
    extractedAudioPath,
  };
}

module.exports = { convertWebmToMp4 };
