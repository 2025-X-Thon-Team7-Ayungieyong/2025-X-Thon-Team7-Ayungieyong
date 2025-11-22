const questionModel = require("../models/questionModel");
const interviewModel = require("../models/interviewModel");
const documentModel = require("../models/documentModel");

class QuestionService {
  // 질문 자동 생성 (AI 에이전트 위임)
  async generateQuestions({
    interviewId,
    documentIds = [],
    jobCategory,
    questionCount = 5,
  }) {
    const interview = await interviewModel.findById(interviewId);
    if (!interview) {
      throw new Error("면접을 찾을 수 없습니다.");
    }

    // 문서 정보 가져오기
    let documents = [];
    if (documentIds.length > 0) {
      for (const docId of documentIds) {
        const doc = await documentModel.findById(docId);
        if (doc && doc.user_id === interview.user_id) {
          documents.push(doc);
        }
      }
    }

    try {
      // AI 에이전트 로드 시도
      const aiAgents = require("../ai-agents");
      const { questionGeneratorAgent } = aiAgents;

      // 에이전트 존재 및 함수 확인
      if (!questionGeneratorAgent?.generate) {
        throw new Error("AI agent not implemented");
      }

      // AI 에이전트로 질문 생성
      const generated = await questionGeneratorAgent.generate({
        documents,
        jobCategory,
        questionCount,
      });

      // DB에 질문 저장
      const questions = await questionModel.createMultiple(
        interviewId,
        generated
      );

      return questions;
    } catch (error) {
      // 개발 모드 더미 허용
      if (process.env.ALLOW_DUMMY_AI === "true") {
        console.warn("Using dummy questions (AI not implemented)");

        const dummyQuestions = [];
        for (let i = 0; i < questionCount; i++) {
          dummyQuestions.push({
            questionText: `[더미] ${jobCategory} 관련 질문 ${
              i + 1
            }: 귀하의 경험에 대해 설명해주세요.`,
            answerGuide: `[더미] 구체적인 경험과 성과를 중심으로 답변하세요.`,
            timeLimit: 180,
          });
        }

        const questions = await questionModel.createMultiple(
          interviewId,
          dummyQuestions
        );
        return questions;
      }

      // AI 에이전트 미구현 에러
      if (
        error.message.includes("not implemented") ||
        error.code === "MODULE_NOT_FOUND"
      ) {
        throw new Error(
          "질문 생성 AI 기능이 아직 구현되지 않았습니다. AI 담당자에게 문의하세요."
        );
      }

      // 기타 에러
      console.error("Question generation error:", error);
      throw new Error("질문 생성 중 오류가 발생했습니다.");
    }
  }

  // 커스텀 질문 추가
  async addCustomQuestion({ interviewId, questionText, timeLimit = 180 }) {
    const currentCount = await questionModel.countByInterviewId(interviewId);

    const questionId = await questionModel.create({
      interviewId,
      questionText,
      answerGuide: null,
      orderNum: currentCount + 1,
      timeLimit,
    });

    return await questionModel.findById(questionId);
  }

  // 질문 목록 조회
  async getQuestions(interviewId) {
    return await questionModel.findByInterviewId(interviewId);
  }

  // 질문 삭제
  async deleteQuestion(questionId, userId) {
    const question = await questionModel.findById(questionId);

    if (!question) {
      throw new Error("질문을 찾을 수 없습니다.");
    }

    const interview = await interviewModel.findById(question.interview_id);
    if (interview.user_id !== userId) {
      throw new Error("접근 권한이 없습니다.");
    }

    return await questionModel.delete(questionId);
  }
}

module.exports = new QuestionService();
