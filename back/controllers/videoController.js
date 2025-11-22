const videoService = require("../services/videoService");
const asyncHandler = require("../utils/asyncHandler");
const fs = require("fs");

const DEFAULT_USER_ID = 1;

class VideoController {
  upload = asyncHandler(async (req, res) => {
    if (!req.file) {
      return res
        .status(400)
        .json({ success: false, message: "영상 파일을 업로드해 주세요." });
    }

    const { interviewId, questionId } = req.body;
    if (!interviewId || !questionId) {
      return res.status(400).json({
        success: false,
        message: "면접 ID와 질문 ID를 입력해 주세요.",
      });
    }

    const video = await videoService.uploadVideo(
      {
        interviewId: parseInt(interviewId, 10),
        questionId: parseInt(questionId, 10),
        videoPath: req.file.path, // 실제 업로드된 경로
        originalName: req.file.originalname, // 필요 시 보관
      },
      DEFAULT_USER_ID
    );

    res.json({
      success: true,
      message: "영상이 업로드되었습니다.",
      data: video,
    });
  });

  stream = asyncHandler(async (req, res) => {
    const { videoId } = req.params;

    const video = await videoService.getVideo(
      parseInt(videoId),
      DEFAULT_USER_ID
    );

    const videoPath = videoService.getVideoPath(video);

    if (!fs.existsSync(videoPath)) {
      return res.status(404).json({
        success: false,
        message: "영상 파일을 찾을 수 없습니다.",
      });
    }

    const stat = fs.statSync(videoPath);
    const fileSize = stat.size;
    const range = req.headers.range;

    if (range) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunksize = end - start + 1;
      const file = fs.createReadStream(videoPath, { start, end });
      const head = {
        "Content-Range": `bytes ${start}-${end}/${fileSize}`,
        "Accept-Ranges": "bytes",
        "Content-Length": chunksize,
        "Content-Type": "video/mp4",
      };

      res.writeHead(206, head);
      file.pipe(res);
    } else {
      const head = {
        "Content-Length": fileSize,
        "Content-Type": "video/mp4",
      };
      res.writeHead(200, head);
      fs.createReadStream(videoPath).pipe(res);
    }
  });

  analyze = asyncHandler(async (req, res) => {
    const { videoId } = req.body;

    if (!videoId) {
      return res.status(400).json({
        success: false,
        message: "영상 ID를 입력해주세요.",
      });
    }

    res.json({
      success: true,
      message: "영상 분석이 시작되었습니다.",
      data: {
        analysisId: 1,
        status: "processing",
        estimatedTime: 60,
      },
    });
  });
}

module.exports = new VideoController();
