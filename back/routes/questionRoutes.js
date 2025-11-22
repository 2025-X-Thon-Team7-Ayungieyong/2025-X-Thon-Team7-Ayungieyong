const express = require("express");
const router = express.Router();
const questionController = require("../controllers/questionController");

router.post("/generate", questionController.generate);
router.post("/custom", questionController.custom);
router.get("/list/:interviewId", questionController.list);
router.delete("/:questionId", questionController.delete);

module.exports = router;
