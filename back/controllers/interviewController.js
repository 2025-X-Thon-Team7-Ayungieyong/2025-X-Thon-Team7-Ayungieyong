const interviewService = require("../services/interviewService");
const asyncHandler = require("../utils/asyncHandler");

const DEFAULT_USER_ID = 1;

class InterviewController {
  create = asyncHandler(async (req, res) => {
    const { title, company, jobCategory, questions } = req.body;

    if (!title || !company || !jobCategory) {
      return res.status(400).json({
        success: false,
        message: "제목, 면접 볼 회사, 직군을 모두 입력해주세요.",
      });
    }

    const interview = await interviewService.createInterview(DEFAULT_USER_ID, {
      title,
      company,
      jobCategory,
      questions: questions || [],
    });

    res.status(201).json({
      success: true,
      message: "면접이 생성되었습니다.",
      data: interview,
    });
  });

  list = asyncHandler(async (req, res) => {
    const safePage =
      Number.isInteger(Number(req.query.page)) && Number(req.query.page) > 0
        ? Number(req.query.page)
        : 1;
    const safeLimit =
      Number.isInteger(Number(req.query.limit)) && Number(req.query.limit) > 0
        ? Number(req.query.limit)
        : 10;
    const { status } = req.query;

    const result = await interviewService.getInterviewList(DEFAULT_USER_ID, {
      status,
      page: safePage,
      limit: safeLimit,
    });

    res.json({ success: true, data: result });
  });

  detail = asyncHandler(async (req, res) => {
    const { interviewId } = req.params;

    const interview = await interviewService.getInterviewDetail(
      parseInt(interviewId),
      DEFAULT_USER_ID
    );

    res.json({
      success: true,
      data: interview,
    });
  });

  delete = asyncHandler(async (req, res) => {
    const { interviewId } = req.params;

    await interviewService.deleteInterview(
      parseInt(interviewId),
      DEFAULT_USER_ID
    );

    res.json({
      success: true,
      message: "면접이 삭제되었습니다.",
    });
  });
}

module.exports = new InterviewController();
