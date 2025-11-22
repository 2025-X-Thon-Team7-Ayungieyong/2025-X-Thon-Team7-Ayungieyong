const db = require("../config/database");

class VideoModel {
  // 비디오 생성
  async create({ interviewId, questionId, videoPath, duration }) {
    const query = `
      INSERT INTO videos (interview_id, question_id, video_path, duration)
      VALUES (?, ?, ?, ?)
    `;
    const result = await db.run(query, [
      interviewId,
      questionId,
      videoPath,
      duration,
    ]);
    return result.id;
  }

  // 비디오 조회
  async findById(videoId) {
    const query = "SELECT * FROM videos WHERE id = ?";
    return await db.get(query, [videoId]);
  }

  // 질문의 비디오 조회
  async findByQuestionId(questionId) {
    const query = "SELECT * FROM videos WHERE question_id = ?";
    return await db.get(query, [questionId]);
  }

  // 면접의 모든 비디오 조회
  async findByInterviewId(interviewId) {
    const query =
      "SELECT * FROM videos WHERE interview_id = ? ORDER BY uploaded_at";
    return await db.query(query, [interviewId]);
  }

  // 오디오 경로 업데이트
  async updateAudioPath(videoId, audioPath) {
    const query = "UPDATE videos SET audio_path = ? WHERE id = ?";
    await db.run(query, [audioPath, videoId]);
    return await this.findById(videoId);
  }
}

module.exports = new VideoModel();
