const fs = require("fs");
const videoModel = require("../models/videoModel");
const interviewModel = require("../models/interviewModel");
const questionModel = require("../models/questionModel");
const path = require("path");
const { convertWebmToMp4AndWav } = require("../utils/videoConverter");

class VideoService {
  async uploadVideo(
    { interviewId, questionId, videoPath, duration, originalName },
    userId
  ) {
    const interview = await interviewModel.findById(interviewId);
    if (!interview) throw new Error("면접을 찾을 수 없습니다.");
    if (interview.user_id !== userId) throw new Error("접근 권한이 없습니다.");

    const question = await questionModel.findById(questionId);
    if (!question || question.interview_id !== interviewId)
      throw new Error("질문을 찾을 수 없습니다.");

    let storedPath = videoPath; // 기본 업로드 경로
    let videoDuration = duration || 0;
    let audioPath = null;

    try {
      if (videoPath && videoPath.toLowerCase().endsWith(".webm")) {
        const absoluteInput = path.isAbsolute(videoPath)
          ? videoPath
          : path.join(__dirname, "..", videoPath);

        const { outputMp4Relative, outputWavRelative, detectedDuration } =
          await convertWebmToMp4AndWav(absoluteInput);

        storedPath = outputMp4Relative || storedPath; // mp4 경로로 교체
        audioPath = outputWavRelative || null;
        if (detectedDuration) videoDuration = detectedDuration;

        // 원본 webm 삭제 (원치 않으면 이 블록 제거)
        try {
          fs.unlinkSync(absoluteInput);
        } catch (e) {
          console.warn("webm 원본 삭제 실패:", e.message);
        }
      }
    } catch (err) {
      console.warn("webm 변환 실패, 원본으로 저장:", err.message);
    }

    const videoId = await videoModel.create({
      interviewId,
      questionId,
      videoPath: storedPath,
      duration: videoDuration,
    });

    if (audioPath) {
      await videoModel.updateAudioPath(videoId, audioPath);
    }

    return await videoModel.findById(videoId);
  }

  async getVideo(videoId, userId) {
    const video = await videoModel.findById(videoId);
    if (!video) throw new Error("영상을 찾을 수 없습니다.");

    const interview = await interviewModel.findById(video.interview_id);
    if (interview.user_id !== userId) throw new Error("접근 권한이 없습니다.");

    return video;
  }

  getVideoPath(video) {
    return path.join(__dirname, "..", video.video_path);
  }

  async getInterviewVideos(interviewId, userId) {
    const interview = await interviewModel.findById(interviewId);
    if (!interview) throw new Error("면접을 찾을 수 없습니다.");
    if (interview.user_id !== userId) throw new Error("접근 권한이 없습니다.");

    return await videoModel.findByInterviewId(interviewId);
  }
}

module.exports = new VideoService();
