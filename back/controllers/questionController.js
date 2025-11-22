const questionService = require("../services/questionService");
const asyncHandler = require("../utils/asyncHandler");

const DEFAULT_USER_ID = 1;

class QuestionController {
  generate = asyncHandler(async (req, res) => {
    const { interviewId, documentIds, jobCategory, questionCount } = req.body;

    if (!interviewId || !jobCategory) {
      return res.status(400).json({
        success: false,
        message: "필수 항목을 입력해주세요.",
      });
    }

    const questions = await questionService.generateQuestions({
      interviewId,
      documentIds: documentIds || [],
      jobCategory,
      questionCount: questionCount || 5,
    });

    res.json({
      success: true,
      message: "질문이 생성되었습니다.",
      data: { questions },
    });
  });

  custom = asyncHandler(async (req, res) => {
    const { interviewId, questionText, timeLimit } = req.body;

    if (!interviewId || !questionText) {
      return res.status(400).json({
        success: false,
        message: "면접 ID와 질문 내용을 입력해주세요.",
      });
    }

    const question = await questionService.addCustomQuestion({
      interviewId,
      questionText,
      timeLimit: timeLimit || 180,
    });

    res.status(201).json({
      success: true,
      message: "질문이 추가되었습니다.",
      data: question,
    });
  });

  list = asyncHandler(async (req, res) => {
    const { interviewId } = req.params;

    const questions = await questionService.getQuestions(parseInt(interviewId));

    res.json({
      success: true,
      data: {
        interviewId: parseInt(interviewId),
        questions,
      },
    });
  });

  delete = asyncHandler(async (req, res) => {
    const { questionId } = req.params;

    await questionService.deleteQuestion(parseInt(questionId), DEFAULT_USER_ID);

    res.json({
      success: true,
      message: "질문이 삭제되었습니다.",
    });
  });
}

module.exports = new QuestionController();
