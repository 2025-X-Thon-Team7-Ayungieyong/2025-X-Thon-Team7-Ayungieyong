const db = require("../config/database");

class DocumentModel {
  // 문서 생성
  async create({ userId, fileName, filePath, fileSize, documentType }) {
    const query = `
      INSERT INTO documents (user_id, file_name, file_path, file_size, document_type)
      VALUES (?, ?, ?, ?, ?)
    `;
    const result = await db.run(query, [
      userId,
      fileName,
      filePath,
      fileSize,
      documentType,
    ]);
    return result.id;
  }

  // 문서 조회
  async findById(documentId) {
    const query = "SELECT * FROM documents WHERE id = ?";
    return await db.get(query, [documentId]);
  }

  // 사용자의 특정 타입 문서 조회
  async findByUserIdAndType(userId, documentType) {
    const query = `
      SELECT * FROM documents
      WHERE user_id = ? AND document_type = ?
    `;
    return await db.get(query, [userId, documentType]);
  }

  // 사용자의 모든 문서 조회
  async findByUserId(userId) {
    const query = `
      SELECT * FROM documents
      WHERE user_id = ?
      ORDER BY document_type, uploaded_at DESC
    `;
    return await db.query(query, [userId]);
  }

  // 이력서(portfolio) 존재 여부 확인
  async hasPortfolio(userId) {
    const query = `
      SELECT COUNT(*) as count
      FROM documents
      WHERE user_id = ? AND document_type = 'portfolio'
    `;
    const result = await db.get(query, [userId]);
    return result.count > 0;
  }

  // 자소서(introduce) 존재 여부 확인
  async hasIntroduce(userId) {
    const query = `
      SELECT COUNT(*) as count
      FROM documents
      WHERE user_id = ? AND document_type = 'introduce'
    `;
    const result = await db.get(query, [userId]);
    return result.count > 0;
  }

  // 이력서와 자소서 둘 다 존재하는지 확인
  async hasBothDocuments(userId) {
    const hasPortfolio = await this.hasPortfolio(userId);
    const hasIntroduce = await this.hasIntroduce(userId);
    return hasPortfolio && hasIntroduce;
  }

  // 추출된 텍스트 업데이트
  async updateExtractedText(documentId, extractedText) {
    const query = "UPDATE documents SET extracted_text = ? WHERE id = ?";
    await db.run(query, [extractedText, documentId]);
    return await this.findById(documentId);
  }

  // 문서 삭제 (타입별)
  async deleteByType(userId, documentType) {
    const query =
      "DELETE FROM documents WHERE user_id = ? AND document_type = ?";
    const result = await db.run(query, [userId, documentType]);
    return result.changes > 0;
  }

  // 문서 삭제
  async delete(documentId) {
    const query = "DELETE FROM documents WHERE id = ?";
    const result = await db.run(query, [documentId]);
    return result.changes > 0;
  }
}

module.exports = new DocumentModel();
