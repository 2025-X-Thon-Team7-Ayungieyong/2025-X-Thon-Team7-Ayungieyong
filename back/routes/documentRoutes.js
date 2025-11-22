const express = require("express");
const router = express.Router();
const documentController = require("../controllers/documentController");
const upload = require("../config/multer");

// 이력서(portfolio) 업로드 (1개만 가능, 덮어쓰기)
router.post(
  "/portfolio/upload",
  upload.single("portfolio"),
  documentController.uploadPortfolio
);

// 자소서(introduce) 업로드 (1개만 가능, 덮어쓰기)
router.post(
  "/introduce/upload",
  upload.single("introduce"),
  documentController.uploadIntroduce
);

// 문서 분석
router.post("/analyze", documentController.analyze);

// 문서 목록 조회 (이력서, 자소서 각 1개씩)
router.get("/list", documentController.list);

// 특정 타입 문서 조회 (portfolio 또는 introduce)
router.get("/list/:type", documentController.getByType);

// 이력서 최신 조회
router.get("/portfolio/latest", documentController.getByType);

// 자소서 최신 조회
router.get("/introduce/latest", documentController.getByType);

// 이력서와 자소서 모두 존재 여부 확인
router.get("/status/check", documentController.checkBothExist);

// 문서 삭제
router.delete("/:documentId", documentController.delete);

module.exports = router;
