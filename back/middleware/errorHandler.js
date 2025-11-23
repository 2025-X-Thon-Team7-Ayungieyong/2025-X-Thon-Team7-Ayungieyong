// 에러 핸들링 미들웨어
const errorHandler = (err, req, res, next) => {
  console.error("Error:", err);

  // Multer 에러
  if (err.name === "MulterError") {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(413).json({
        success: false,
        errorCode: "FILE_TOO_LARGE",
        message: "파일 크기가 너무 큽니다. (최대 100MB)",
      });
    }
    return res.status(400).json({
      success: false,
      errorCode: "FILE_UPLOAD_ERROR",
      message: err.message,
    });
  }

  // 일반 에러
  const statusCode = err.statusCode || 500;
  const message = err.message || "서버 오류가 발생했습니다.";

  res.status(statusCode).json({
    success: false,
    errorCode: err.errorCode || "INTERNAL_ERROR",
    message,
  });
};

module.exports = errorHandler;
