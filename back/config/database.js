const mysql = require("mysql2/promise");
require("dotenv").config();

class Database {
  constructor() {
    this.pool = mysql.createPool({
      host: process.env.DB_HOST || "localhost",
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || "root",
      password: process.env.DB_PASSWORD || "",
      database: process.env.DB_NAME || "interview_system",
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    });

    this.initTables();
  }

  async initTables() {
    try {
      const connection = await this.pool.getConnection();

      const tables = [
        // users 테이블
        `CREATE TABLE IF NOT EXISTS users (
          id INT AUTO_INCREMENT PRIMARY KEY,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,

        // documents 테이블
        `CREATE TABLE IF NOT EXISTS documents (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NOT NULL DEFAULT 1,
          document_type VARCHAR(50) NOT NULL COMMENT '문서 유형 (portfolio, introduce)',
          file_name VARCHAR(255) NOT NULL,
          file_path VARCHAR(500) NOT NULL,
          file_size INT NULL COMMENT '파일 크기 (bytes)',
          extracted_text TEXT,
          uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          INDEX idx_user (user_id),
          INDEX idx_user_type (user_id, document_type),
          UNIQUE KEY unique_user_document_type (user_id, document_type)
        )`,

        // interviews 테이블
        `CREATE TABLE IF NOT EXISTS interviews (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NOT NULL DEFAULT 1,
          title VARCHAR(200) NOT NULL,
          job_category VARCHAR(100) NOT NULL,
          status ENUM('pending', 'in_progress', 'completed') DEFAULT 'pending',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          completed_at TIMESTAMP NULL,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          INDEX idx_user_status (user_id, status)
        )`,

        // questions 테이블
        `CREATE TABLE IF NOT EXISTS questions (
          id INT AUTO_INCREMENT PRIMARY KEY,
          interview_id INT NOT NULL,
          question_text TEXT NOT NULL,
          answer_guide TEXT,
          order_num INT NOT NULL,
          time_limit INT DEFAULT 180,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (interview_id) REFERENCES interviews(id) ON DELETE CASCADE,
          INDEX idx_interview_order (interview_id, order_num)
        )`,

        // videos 테이블
        `CREATE TABLE IF NOT EXISTS videos (
          id INT AUTO_INCREMENT PRIMARY KEY,
          interview_id INT NOT NULL,
          question_id INT NOT NULL,
          video_path VARCHAR(500) NOT NULL,
          audio_path VARCHAR(500),
          duration INT,
          uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (interview_id) REFERENCES interviews(id) ON DELETE CASCADE,
          FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE,
          INDEX idx_interview (interview_id),
          INDEX idx_question (question_id)
        )`,

        // feedbacks 테이블
        `CREATE TABLE IF NOT EXISTS feedbacks (
          id INT AUTO_INCREMENT PRIMARY KEY,
          video_id INT NOT NULL,
          expression_score INT,
          eye_contact_score INT,
          voice_score INT,
          content_score INT,
          overall_score INT,
          good_points TEXT,
          bad_points TEXT,
          improvement TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE,
          UNIQUE KEY unique_video_feedback (video_id)
        )`,
      ];

      for (const query of tables) {
        await connection.query(query);
      }

      // 기본 사용자 생성
      await connection.query(`
        INSERT IGNORE INTO users (id) VALUES (1)
      `);

      connection.release();
      console.log("Database tables initialized successfully");
    } catch (error) {
      console.error("Database initialization error:", error);
    }
  }

  async query(sql, params = []) {
    const [rows] = await this.pool.execute(sql, params);
    return rows;
  }

  async get(sql, params = []) {
    const [rows] = await this.pool.execute(sql, params);
    return rows[0] || null;
  }

  async run(sql, params = []) {
    const [result] = await this.pool.execute(sql, params);
    return {
      id: result.insertId,
      changes: result.affectedRows,
    };
  }
}

module.exports = new Database();
