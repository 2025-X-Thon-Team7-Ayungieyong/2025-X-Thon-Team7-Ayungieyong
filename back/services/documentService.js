const documentModel = require("../models/documentModel");
const fs = require("fs");
const path = require("path");

class DocumentService {
  // 문서 업로드 (portfolio 또는 introduce, 각 1개씩만 가능)
  async uploadDocument(userId, file, documentType) {
    // documentType 검증
    if (!["portfolio", "introduce"].includes(documentType)) {
      throw new Error("문서 타입은 portfolio 또는 introduce만 가능합니다.");
    }

    // 이미 해당 타입의 문서가 존재하는지 확인
    const existingDoc = await documentModel.findByUserIdAndType(
      userId,
      documentType
    );

    if (existingDoc) {
      // 기존 파일 삭제
      if (fs.existsSync(existingDoc.file_path)) {
        fs.unlinkSync(existingDoc.file_path);
      }

      // DB에서 기존 문서 삭제
      await documentModel.deleteByType(userId, documentType);
    }

    // 새 문서 생성
    const documentId = await documentModel.create({
      userId,
      fileName: file.originalname,
      filePath: file.path,
      fileSize: file.size,
      documentType,
    });

    return await documentModel.findById(documentId);
  }

  // 문서 분석
  async analyzeDocument(documentId, userId) {
    const document = await documentModel.findById(documentId);

    if (!document) {
      throw new Error("문서를 찾을 수 없습니다.");
    }

    if (document.user_id !== userId) {
      throw new Error("접근 권한이 없습니다.");
    }

    // TODO: PDF 텍스트 추출
    const extractedText = `문서에서 추출된 텍스트 내용...`;

    await documentModel.updateExtractedText(documentId, extractedText);

    return {
      documentId,
      documentType: document.document_type,
      fileName: document.file_name,
      extractedText,
      analysis: {
        keyPoints: ["주요 포인트 1", "주요 포인트 2"],
        skills: ["Python", "JavaScript"],
        summary: "문서 요약",
      },
    };
  }

  // 사용자의 모든 문서 조회
  async getDocuments(userId) {
    const documents = await documentModel.findByUserId(userId);

    const portfolio =
      documents.find((doc) => doc.document_type === "portfolio") || null;
    const introduce =
      documents.find((doc) => doc.document_type === "introduce") || null;

    return {
      portfolio,
      introduce,
      hasBoth: portfolio !== null && introduce !== null,
    };
  }

  // 특정 타입 문서 조회
  async getDocumentByType(userId, documentType) {
    if (!["portfolio", "introduce"].includes(documentType)) {
      throw new Error("문서 타입은 portfolio 또는 introduce만 가능합니다.");
    }

    return await documentModel.findByUserIdAndType(userId, documentType);
  }

  // 이력서와 자소서가 모두 존재하는지 확인
  async checkBothDocumentsExist(userId) {
    return await documentModel.hasBothDocuments(userId);
  }

  // 문서 삭제
  async deleteDocument(documentId, userId) {
    const document = await documentModel.findById(documentId);

    if (!document) {
      throw new Error("문서를 찾을 수 없습니다.");
    }

    if (document.user_id !== userId) {
      throw new Error("접근 권한이 없습니다.");
    }

    // 파일 삭제
    if (fs.existsSync(document.file_path)) {
      fs.unlinkSync(document.file_path);
    }

    return await documentModel.delete(documentId);
  }
}

module.exports = new DocumentService();
