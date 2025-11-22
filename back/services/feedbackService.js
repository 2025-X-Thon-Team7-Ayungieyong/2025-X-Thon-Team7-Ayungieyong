const feedbackModel = require("../models/feedbackModel");
const videoModel = require("../models/videoModel");
const interviewModel = require("../models/interviewModel");
const questionModel = require("../models/questionModel");
const analysisService = require("./analysisService");

class FeedbackService {
  /**
   * 분석 결과를 DB 저장용 포맷으로 정규화
   */
  normalizeReport(report, videoId) {
    return {
      videoId: videoId,
      expressionScore:
        report.expressionScore || report.expression?.expressionScore || 0,
      eyeContactScore:
        report.eyeContactScore || report.expression?.eyeContactScore || 0,
      voiceScore: report.voiceScore || report.voice?.voiceScore || 0,
      contentScore: report.contentScore || 0,
      overallScore: report.overallScore || 0,
      goodPoints:
        report.goodPoints || report.expression?.notes || "분석 결과 없음",
      badPoints: report.badPoints || "분석 결과 없음",
      improvement: report.improvement || "분석 결과 없음",
    };
  }

  // 영상 분석 및 피드백 생성 (AI 에이전트 위임)
  async analyzeAndCreateFeedback(videoId, userId) {
    const video = await videoModel.findById(videoId);

    if (!video) {
      throw new Error("영상을 찾을 수 없습니다.");
    }

    const interview = await interviewModel.findById(video.interview_id);
    if (interview.user_id !== userId) {
      throw new Error("접근 권한이 없습니다.");
    }

    const question = await questionModel.findById(video.question_id);

    try {
      // 영상 분석 (표정 + 음성)
      const analysis = await analysisService.analyze(video);

      // 레포트 빌더 에이전트 시도 (선택적)
      let report = analysis;

      try {
        const aiAgents = require("../ai-agents");
        const { reportBuilderAgent } = aiAgents;

        if (reportBuilderAgent?.build) {
          console.log("Using report builder agent");
          report = await reportBuilderAgent.build({
            analysis,
            interview,
            question,
          });
        } else {
          console.warn("Report builder agent not found, using raw analysis");
        }
      } catch (error) {
        console.warn(
          "Report builder error, using raw analysis:",
          error.message
        );
      }

      // DB에 피드백 저장
      await feedbackModel.create(this.normalizeReport(report, videoId));

      return await feedbackModel.findByVideoId(videoId);
    } catch (error) {
      // 개발 모드 더미 허용
      if (process.env.ALLOW_DUMMY_AI === "true") {
        console.warn("Using dummy feedback (AI not implemented)");

        const dummyFeedback = {
          videoId: videoId,
          expressionScore: 85,
          eyeContactScore: 75,
          voiceScore: 80,
          contentScore: 90,
          overallScore: 82,
          goodPoints: "[더미] 전체적으로 안정적인 면접 태도를 보였습니다.",
          badPoints: "[더미] 일부 개선이 필요한 부분이 있습니다.",
          improvement: "[더미] 지속적인 연습을 권장합니다.",
        };

        await feedbackModel.create(dummyFeedback);
        return await feedbackModel.findByVideoId(videoId);
      }

      // AI 에이전트 미구현 에러
      if (
        error.message.includes("not implemented") ||
        error.code === "MODULE_NOT_FOUND"
      ) {
        throw new Error(
          "피드백 생성 AI 기능이 아직 구현되지 않았습니다. AI 담당자에게 문의하세요."
        );
      }

      // 기타 에러
      console.error("Feedback creation error:", error);
      throw new Error("피드백 생성 중 오류가 발생했습니다.");
    }
  }

  // 면접 전체 피드백 조회
  async getInterviewFeedback(interviewId, userId) {
    const interview = await interviewModel.findById(interviewId);

    if (!interview) {
      throw new Error("면접을 찾을 수 없습니다.");
    }

    if (interview.user_id !== userId) {
      throw new Error("접근 권한이 없습니다.");
    }

    const feedbacks = await feedbackModel.findByInterviewId(interviewId);

    if (feedbacks.length === 0) {
      return {
        interviewId,
        overallFeedback: null,
        questionFeedbacks: [],
      };
    }

    // 평균 점수 계산
    const avgScores = {
      expression: Math.round(
        feedbacks.reduce((sum, f) => sum + f.expression_score, 0) /
          feedbacks.length
      ),
      eyeContact: Math.round(
        feedbacks.reduce((sum, f) => sum + f.eye_contact_score, 0) /
          feedbacks.length
      ),
      voice: Math.round(
        feedbacks.reduce((sum, f) => sum + f.voice_score, 0) / feedbacks.length
      ),
      content: Math.round(
        feedbacks.reduce((sum, f) => sum + f.content_score, 0) /
          feedbacks.length
      ),
      overall: Math.round(
        feedbacks.reduce((sum, f) => sum + f.overall_score, 0) /
          feedbacks.length
      ),
    };

    return {
      interviewId,
      overallFeedback: {
        scores: avgScores,
        goodPoints: "전체적으로 좋은 면접이었습니다.",
        badPoints: "개선이 필요한 부분이 있습니다.",
        improvement: "지속적인 연습을 권장합니다.",
      },
      questionFeedbacks: feedbacks.map((f) => ({
        questionId: f.question_id,
        questionText: f.question_text,
        videoId: f.video_id,
        scores: {
          expression: f.expression_score,
          eyeContact: f.eye_contact_score,
          voice: f.voice_score,
          content: f.content_score,
          overall: f.overall_score,
        },
        detailedFeedback: {
          goodPoints: f.good_points,
          badPoints: f.bad_points,
          improvement: f.improvement,
        },
      })),
    };
  }

  // 질문별 상세 피드백
  async getDetailedFeedback(videoId, userId) {
    const video = await videoModel.findById(videoId);

    if (!video) {
      throw new Error("영상을 찾을 수 없습니다.");
    }

    const interview = await interviewModel.findById(video.interview_id);
    if (interview.user_id !== userId) {
      throw new Error("접근 권한이 없습니다.");
    }

    const feedback = await feedbackModel.findByVideoId(videoId);

    if (!feedback) {
      throw new Error("피드백을 찾을 수 없습니다.");
    }

    return {
      videoId: video.id,
      questionId: video.question_id,
      videoUrl: `/api/video/stream/${video.id}`,
      scores: {
        expression: feedback.expression_score,
        eyeContact: feedback.eye_contact_score,
        voice: feedback.voice_score,
        content: feedback.content_score,
        overall: feedback.overall_score,
      },
      feedback: {
        goodPoints: feedback.good_points,
        badPoints: feedback.bad_points,
        improvement: feedback.improvement,
      },
    };
  }
}

module.exports = new FeedbackService();
