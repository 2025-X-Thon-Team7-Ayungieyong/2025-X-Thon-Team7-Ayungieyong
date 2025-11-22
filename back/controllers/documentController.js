const documentService = require("../services/documentService");
const asyncHandler = require("../utils/asyncHandler");

const DEFAULT_USER_ID = 1;

class DocumentController {
  // 이력서(portfolio) 업로드 (1개만 가능, 덮어쓰기)
  uploadPortfolio = asyncHandler(async (req, res) => {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "PDF 파일을 업로드해주세요.",
      });
    }

    const document = await documentService.uploadDocument(
      DEFAULT_USER_ID,
      req.file,
      "portfolio"
    );

    res.json({
      success: true,
      message: "이력서가 업로드되었습니다.",
      data: document,
    });
  });

  // 자소서(introduce) 업로드 (1개만 가능, 덮어쓰기)
  uploadIntroduce = asyncHandler(async (req, res) => {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "PDF 파일을 업로드해주세요.",
      });
    }

    const document = await documentService.uploadDocument(
      DEFAULT_USER_ID,
      req.file,
      "introduce"
    );

    res.json({
      success: true,
      message: "자기소개서가 업로드되었습니다.",
      data: document,
    });
  });

  // 문서 분석
  analyze = asyncHandler(async (req, res) => {
    const { documentId } = req.body;

    if (!documentId) {
      return res.status(400).json({
        success: false,
        message: "문서 ID를 입력해주세요.",
      });
    }

    const result = await documentService.analyzeDocument(
      parseInt(documentId),
      DEFAULT_USER_ID
    );

    res.json({
      success: true,
      message: "문서 분석이 완료되었습니다.",
      data: result,
    });
  });

  // 문서 목록 조회 (이력서, 자소서 각 1개씩)
  list = asyncHandler(async (req, res) => {
    const documents = await documentService.getDocuments(DEFAULT_USER_ID);

    res.json({
      success: true,
      data: documents,
    });
  });

  // 특정 타입 문서 조회
  getByType = asyncHandler(async (req, res) => {
    const { type } = req.params;

    const document = await documentService.getDocumentByType(
      DEFAULT_USER_ID,
      type
    );

    if (!document) {
      return res.status(404).json({
        success: false,
        message: `${
          type === "portfolio" ? "이력서" : "자기소개서"
        }가 업로드되지 않았습니다.`,
      });
    }

    res.json({
      success: true,
      data: document,
    });
  });

  // 이력서와 자소서 모두 존재 여부 확인
  checkBothExist = asyncHandler(async (req, res) => {
    const hasBoth = await documentService.checkBothDocumentsExist(
      DEFAULT_USER_ID
    );

    res.json({
      success: true,
      data: {
        hasBothDocuments: hasBoth,
      },
    });
  });

  // 문서 삭제
  delete = asyncHandler(async (req, res) => {
    const { documentId } = req.params;

    await documentService.deleteDocument(parseInt(documentId), DEFAULT_USER_ID);

    res.json({
      success: true,
      message: "문서가 삭제되었습니다.",
    });
  });
}

module.exports = new DocumentController();
