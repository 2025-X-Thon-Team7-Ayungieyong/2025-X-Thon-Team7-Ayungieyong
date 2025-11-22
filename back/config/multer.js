const multer = require("multer");
const path = require("path");
const fs = require("fs");

// 업로드 디렉토리 생성
const uploadDirs = ["uploads/documents", "uploads/videos", "uploads/temp"];

uploadDirs.forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// 저장 설정
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let uploadPath = "uploads/temp";

    if (file.fieldname === "portfolio" || file.fieldname === "introduce") {
      uploadPath = "uploads/documents";
    } else if (file.fieldname === "video") {
      uploadPath = "uploads/videos";
    }

    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext);
    cb(null, `${name}-${uniqueSuffix}${ext}`);
  },
});

// 파일 필터
const fileFilter = (req, file, cb) => {
  if (file.fieldname === "portfolio" || file.fieldname === "introduce") {
    if (file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(new Error("PDF 파일만 업로드 가능합니다."), false);
    }
  } else if (file.fieldname === "video") {
    if (file.mimetype.startsWith("video/")) {
      cb(null, true);
    } else {
      cb(new Error("비디오 파일만 업로드 가능합니다."), false);
    }
  } else {
    cb(null, true);
  }
};

// 파일 크기 제한
const limits = {
  fileSize: 100 * 1024 * 1024, // 100MB
};

const upload = multer({ storage, fileFilter, limits });

module.exports = upload;
