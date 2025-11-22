// 통일된 응답 포맷 헬퍼
class ResponseHelper {
  success(res, data, message = "Success", statusCode = 200) {
    return res.status(statusCode).json({
      success: true,
      message,
      data,
    });
  }

  error(
    res,
    message = "Error",
    statusCode = 500,
    errorCode = "INTERNAL_ERROR"
  ) {
    return res.status(statusCode).json({
      success: false,
      errorCode,
      message,
    });
  }
}

module.exports = new ResponseHelper();
