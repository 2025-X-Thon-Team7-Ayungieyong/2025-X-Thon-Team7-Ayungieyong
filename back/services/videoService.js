const videoModel = require("../models/videoModel");
const interviewModel = require("../models/interviewModel");
const questionModel = require("../models/questionModel");
const path = require("path");
const { convertWebmToMp4 } = require("../utils/videoConverter"); // mp4 변환 유틸 !

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

    let storedPath = videoPath; // 기본은 업로드된 원본 경로
    let videoDuration = duration || 0;
    let audioPath = null;

    // webm → mp4 변환 시도
    try {
      if (videoPath && videoPath.toLowerCase().endsWith(".webm")) {
        const absoluteInput = path.isAbsolute(videoPath)
          ? videoPath
          : path.join(__dirname, "..", videoPath);
        const { outputRelative, detectedDuration, extractedAudioPath } =
          await convertWebmToMp4(absoluteInput);

        storedPath = outputRelative || storedPath;
        if (detectedDuration) videoDuration = detectedDuration;
        if (extractedAudioPath) audioPath = extractedAudioPath;
      }
    } catch (err) {
      console.warn("webm->mp4 변환 실패, 원본으로 저장:", err.message);
    }

    // DB 저장
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

  // 비디오 조회
  async getVideo(videoId, userId) {
    const video = await videoModel.findById(videoId);

    if (!video) {
      throw new Error("영상을 찾을 수 없습니다.");
    }

    const interview = await interviewModel.findById(video.interview_id);
    if (interview.user_id !== userId) {
      throw new Error("접근 권한이 없습니다.");
    }

    return video;
  }

  // 비디오 경로 반환
  getVideoPath(video) {
    return path.join(__dirname, "..", video.video_path);
  }

  // 면접의 모든 비디오
  async getInterviewVideos(interviewId, userId) {
    const interview = await interviewModel.findById(interviewId);
    if (!interview) {
      throw new Error("면접을 찾을 수 없습니다.");
    }
    if (interview.user_id !== userId) {
      throw new Error("접근 권한이 없습니다.");
    }

    return await videoModel.findByInterviewId(interviewId);
  }
}

module.exports = new VideoService();
