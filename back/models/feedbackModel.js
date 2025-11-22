const db = require("../config/database");

class FeedbackModel {
  // 피드백 생성
  async create(feedbackData) {
    const {
      videoId,
      expressionScore,
      eyeContactScore,
      voiceScore,
      contentScore,
      overallScore,
      goodPoints,
      badPoints,
      improvement,
    } = feedbackData;

    const query = `
      INSERT INTO feedbacks (
        video_id, expression_score, eye_contact_score, voice_score, content_score,
        overall_score, good_points, bad_points, improvement
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const result = await db.run(query, [
      videoId,
      expressionScore,
      eyeContactScore,
      voiceScore,
      contentScore,
      overallScore,
      goodPoints,
      badPoints,
      improvement,
    ]);

    return result.id;
  }

  // 비디오의 피드백 조회
  async findByVideoId(videoId) {
    const query = "SELECT * FROM feedbacks WHERE video_id = ?";
    return await db.get(query, [videoId]);
  }

  // 면접의 모든 피드백 조회
  async findByInterviewId(interviewId) {
    const query = `
      SELECT f.*, v.question_id, q.question_text
      FROM feedbacks f
      JOIN videos v ON f.video_id = v.id
      JOIN questions q ON v.question_id = q.id
      WHERE v.interview_id = ?
      ORDER BY q.order_num
    `;
    return await db.query(query, [interviewId]);
  }

  // 피드백 업데이트
  async update(videoId, feedbackData) {
    const {
      expressionScore,
      eyeContactScore,
      voiceScore,
      contentScore,
      overallScore,
      goodPoints,
      badPoints,
      improvement,
    } = feedbackData;

    const query = `
      UPDATE feedbacks
      SET expression_score = ?, eye_contact_score = ?, voice_score = ?,
          content_score = ?, overall_score = ?, good_points = ?,
          bad_points = ?, improvement = ?
      WHERE video_id = ?
    `;

    await db.run(query, [
      expressionScore,
      eyeContactScore,
      voiceScore,
      contentScore,
      overallScore,
      goodPoints,
      badPoints,
      improvement,
      videoId,
    ]);

    return await this.findByVideoId(videoId);
  }
}

module.exports = new FeedbackModel();
