const documentModel = require("../models/documentModel");
const fs = require("fs");

class DocumentService {
  // 문서 업로드
  async uploadDocument(userId, file, documentType) {
    if (!["portfolio", "introduce"].includes(documentType)) {
      throw new Error("문서 타입은 portfolio 또는 introduce만 가능합니다.");
    }

    const existingDoc = await documentModel.findByUserIdAndType(
      userId,
      documentType
    );

    if (existingDoc) {
      if (fs.existsSync(existingDoc.file_path)) {
        fs.unlinkSync(existingDoc.file_path);
      }
      await documentModel.deleteByType(userId, documentType);
    }

    const documentId = await documentModel.create({
      userId,
      fileName: file.originalname,
      filePath: file.path,
      fileSize: file.size,
      documentType,
    });

    return await documentModel.findById(documentId);
  }

  // 문서 분석 (AI 에이전트 위임)
  async analyzeDocument(documentId, userId) {
    const document = await documentModel.findById(documentId);

    if (!document) {
      throw new Error("문서를 찾을 수 없습니다.");
    }

    if (document.user_id !== userId) {
      throw new Error("접근 권한이 없습니다.");
    }

    try {
      // AI 에이전트 로드 시도
      const aiAgents = require("../ai-agents");
      const { documentReaderAgent } = aiAgents;

      // 에이전트 존재 및 함수 확인
      if (!documentReaderAgent?.extractAndSummarize) {
        throw new Error("AI agent not implemented");
      }

      // AI 에이전트로 PDF 텍스트 추출 및 요약
      const extracted = await documentReaderAgent.extractAndSummarize(
        document.file_path
      );

      // DB에 추출된 텍스트 저장
      await documentModel.updateExtractedText(
        documentId,
        extracted.rawText || ""
      );

      return {
        documentId,
        documentType: document.document_type,
        fileName: document.file_name,
        extractedText: extracted.rawText || "",
        analysis: {
          summary: extracted.summary || "",
          keyPoints: extracted.keyPoints || [],
          skills: extracted.skills || [],
        },
      };
    } catch (error) {
      // AI 에이전트 미구현 에러
      if (
        error.message.includes("not implemented") ||
        error.code === "MODULE_NOT_FOUND"
      ) {
        throw new Error(
          "문서 분석 AI 기능이 아직 구현되지 않았습니다. AI 담당자에게 문의하세요."
        );
      }

      // 기타 에러
      console.error("Document analysis error:", error);
      throw new Error("문서 분석 중 오류가 발생했습니다.");
    }
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

    if (fs.existsSync(document.file_path)) {
      fs.unlinkSync(document.file_path);
    }

    return await documentModel.delete(documentId);
  }
}

module.exports = new DocumentService();
