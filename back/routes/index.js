const express = require("express");
const router = express.Router();

const documentRoutes = require("./documentRoutes");

// 라우트 등록
router.use("/document", documentRoutes);

module.exports = router;
