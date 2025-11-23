const db = require("../config/database");

class QuestionModel {
  // 질문 생성
  async create({
    interviewId,
    questionText,
    answerGuide,
    orderNum,
    timeLimit = 180,
  }) {
    const query = `
      INSERT INTO questions (interview_id, question_text, answer_guide, order_num, time_limit)
      VALUES (?, ?, ?, ?, ?)
    `;
    const result = await db.run(query, [
      interviewId,
      questionText,
      answerGuide,
      orderNum,
      timeLimit,
    ]);
    return result.id;
  }

  // 여러 질문 일괄 생성
  async createMultiple(interviewId, questions) {
    const createdQuestions = [];

    for (let i = 0; i < questions.length; i++) {
      const question = questions[i];
      const questionId = await this.create({
        interviewId,
        questionText: question.questionText,
        answerGuide: question.answerGuide || null,
        orderNum: i + 1,
        timeLimit: question.timeLimit || 180,
      });

      createdQuestions.push({
        questionId,
        ...question,
        orderNum: i + 1,
      });
    }

    return createdQuestions;
  }

  // 면접의 질문 목록 조회
  async findByInterviewId(interviewId) {
    const query =
      "SELECT * FROM questions WHERE interview_id = ? ORDER BY order_num";
    return await db.query(query, [interviewId]);
  }

  // 질문 상세 조회
  async findById(questionId) {
    const query = "SELECT * FROM questions WHERE id = ?";
    return await db.get(query, [questionId]);
  }

  // 질문 삭제
  async delete(questionId) {
    const query = "DELETE FROM questions WHERE id = ?";
    const result = await db.run(query, [questionId]);
    return result.changes > 0;
  }

  // 면접의 질문 개수 조회
  async countByInterviewId(interviewId) {
    const query =
      "SELECT COUNT(*) as count FROM questions WHERE interview_id = ?";
    const result = await db.get(query, [interviewId]);
    return result.count;
  }
}

module.exports = new QuestionModel();
