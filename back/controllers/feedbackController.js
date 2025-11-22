const feedbackService = require("../services/feedbackService");
const asyncHandler = require("../utils/asyncHandler");

const DEFAULT_USER_ID = 1;

class FeedbackController {
  getInterviewFeedback = asyncHandler(async (req, res) => {
    const { interviewId } = req.params;

    const feedback = await feedbackService.getInterviewFeedback(
      parseInt(interviewId),
      DEFAULT_USER_ID
    );

    res.json({
      success: true,
      data: feedback,
    });
  });

  getDetailedFeedback = asyncHandler(async (req, res) => {
    const { videoId } = req.params;

    const feedback = await feedbackService.getDetailedFeedback(
      parseInt(videoId),
      DEFAULT_USER_ID
    );

    res.json({
      success: true,
      data: feedback,
    });
  });

  analyze = asyncHandler(async (req, res) => {
    const { videoId } = req.body;

    if (!videoId) {
      return res.status(400).json({
        success: false,
        message: "영상 ID를 입력해주세요.",
      });
    }

    const feedback = await feedbackService.analyzeAndCreateFeedback(
      parseInt(videoId),
      DEFAULT_USER_ID
    );

    res.json({
      success: true,
      message: "피드백이 생성되었습니다.",
      data: feedback,
    });
  });
}

module.exports = new FeedbackController();
