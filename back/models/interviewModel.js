const db = require("../config/database");

class InterviewModel {
  // 면접 생성
  async create({ userId, title, company, jobCategory }) {
    const query = `
      INSERT INTO interviews (user_id, title, company, job_category, status)
      VALUES (?, ?, ?, ?, 'pending')
    `;
    const result = await db.run(query, [userId, title, company, jobCategory]);
    return result.id;
  }

  // 면접 목록 조회
  async findByUserId(userId, { status, page = 1, limit = 10 }) {
    const safePage =
      Number.isInteger(Number(page)) && Number(page) > 0 ? Number(page) : 1;
    const safeLimit =
      Number.isInteger(Number(limit)) && Number(limit) > 0 ? Number(limit) : 10;
    const offset = (safePage - 1) * safeLimit;

    let query = `
    SELECT i.*,
           COUNT(DISTINCT q.id) as question_count
    FROM interviews i
    LEFT JOIN questions q ON i.id = q.interview_id
    WHERE i.user_id = ?
  `;
    const params = [userId];
    if (status) {
      query += " AND i.status = ?";
      params.push(status);
    }

    // 숫자만 인라인
    query += ` GROUP BY i.id ORDER BY i.created_at DESC LIMIT ${safeLimit} OFFSET ${offset}`;
    const interviews = await db.query(query, params);

    // 카운트 쿼리도 safeLimit/safePage 사용
    let countQuery =
      "SELECT COUNT(*) as total FROM interviews WHERE user_id = ?";
    const countParams = [userId];
    if (status) {
      countQuery += " AND status = ?";
      countParams.push(status);
    }
    const countResult = await db.get(countQuery, countParams);
    const totalCount = countResult.total;

    return {
      interviews,
      pagination: {
        currentPage: safePage,
        totalPages: Math.ceil(totalCount / safeLimit),
        totalCount,
        hasNext: safePage * safeLimit < totalCount,
        hasPrev: safePage > 1,
      },
    };
  }

  // 면접 상세 조회
  async findById(interviewId) {
    const query = "SELECT * FROM interviews WHERE id = ?";
    return await db.get(query, [interviewId]);
  }

  // 질문과 함께 면접 상세 조회
  async findByIdWithQuestions(interviewId) {
    const interview = await this.findById(interviewId);

    if (!interview) return null;

    const questionsQuery = `
      SELECT q.*,
             v.id as video_id,
             CASE WHEN v.id IS NOT NULL THEN 1 ELSE 0 END as is_answered
      FROM questions q
      LEFT JOIN videos v ON q.id = v.question_id
      WHERE q.interview_id = ?
      ORDER BY q.order_num
    `;

    const questions = await db.query(questionsQuery, [interviewId]);

    return {
      ...interview,
      questions,
    };
  }

  // 면접 상태 업데이트
  async updateStatus(interviewId, status) {
    const query = "UPDATE interviews SET status = ? WHERE id = ?";
    await db.run(query, [status, interviewId]);
    return await this.findById(interviewId);
  }

  // 면접 완료 처리
  async complete(interviewId) {
    const query = `
      UPDATE interviews
      SET status = 'completed',
          completed_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;
    await db.run(query, [interviewId]);
    return await this.findById(interviewId);
  }

  // 면접 삭제
  async delete(interviewId) {
    const query = "DELETE FROM interviews WHERE id = ?";
    const result = await db.run(query, [interviewId]);
    return result.changes > 0;
  }
}

module.exports = new InterviewModel();
