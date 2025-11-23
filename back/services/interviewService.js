const interviewModel = require("../models/interviewModel");
const questionModel = require("../models/questionModel");

class InterviewService {
  // 면접 생성
  async createInterview(
    userId,
    { title, company, jobCategory, questions = [] }
  ) {
    const normalizedQuestions = Array.isArray(questions)
      ? questions
          .map((q) => {
            if (typeof q === "string") {
              return { questionText: q.trim() };
            }

            if (q && typeof q === "object") {
              return {
                questionText: q.questionText || q.title || "",
                answerGuide: q.answerGuide || null,
                timeLimit: q.timeLimit,
              };
            }

            return null;
          })
          .filter((q) => q && q.questionText)
      : [];

    const interviewId = await interviewModel.create({
      userId,
      title,
      company,
      jobCategory,
    });

    if (normalizedQuestions.length > 0) {
      await questionModel.createMultiple(interviewId, normalizedQuestions);
    }

    return await interviewModel.findByIdWithQuestions(interviewId);
  }

  // 면접 목록 조회
  async getInterviewList(userId, options) {
    return await interviewModel.findByUserId(userId, options);
  }

  // 면접 상세 조회
  async getInterviewDetail(interviewId, userId) {
    const interview = await interviewModel.findByIdWithQuestions(interviewId);

    if (!interview) {
      throw new Error("면접을 찾을 수 없습니다.");
    }

    if (interview.user_id !== userId) {
      throw new Error("접근 권한이 없습니다.");
    }

    return interview;
  }

  // 면접 삭제
  async deleteInterview(interviewId, userId) {
    const interview = await interviewModel.findById(interviewId);

    if (!interview) {
      throw new Error("면접을 찾을 수 없습니다.");
    }

    if (interview.user_id !== userId) {
      throw new Error("접근 권한이 없습니다.");
    }

    return await interviewModel.delete(interviewId);
  }

  // 면접 상태 업데이트
  async updateInterviewStatus(interviewId, status, userId) {
    const interview = await interviewModel.findById(interviewId);

    if (!interview) {
      throw new Error("면접을 찾을 수 없습니다.");
    }

    if (interview.user_id !== userId) {
      throw new Error("접근 권한이 없습니다.");
    }

    return await interviewModel.updateStatus(interviewId, status);
  }

  // 면접 완료
  async completeInterview(interviewId, userId) {
    const interview = await interviewModel.findById(interviewId);

    if (!interview) {
      throw new Error("면접을 찾을 수 없습니다.");
    }

    if (interview.user_id !== userId) {
      throw new Error("접근 권한이 없습니다.");
    }

    return await interviewModel.complete(interviewId);
  }
}

module.exports = new InterviewService();
