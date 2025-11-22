const express = require("express");
const router = express.Router();
const feedbackController = require("../controllers/feedbackController");

router.get("/:interviewId", feedbackController.getInterviewFeedback);
router.get("/detail/:videoId", feedbackController.getDetailedFeedback);
router.post("/analyze", feedbackController.analyze);

module.exports = router;
