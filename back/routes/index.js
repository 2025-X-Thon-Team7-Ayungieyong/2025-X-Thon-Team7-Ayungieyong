const express = require("express");
const router = express.Router();

const interviewRoutes = require("./interviewRoutes");
const questionRoutes = require("./questionRoutes");
const videoRoutes = require("./videoRoutes");
const feedbackRoutes = require("./feedbackRoutes");
const documentRoutes = require("./documentRoutes");

// 라우트 등록
router.use("/interview", interviewRoutes);
router.use("/question", questionRoutes);
router.use("/video", videoRoutes);
router.use("/feedback", feedbackRoutes);
router.use("/document", documentRoutes);

module.exports = router;
