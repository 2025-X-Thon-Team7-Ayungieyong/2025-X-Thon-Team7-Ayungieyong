const express = require("express");
const router = express.Router();
const interviewController = require("../controllers/interviewController");

router.post("/create", interviewController.create);
router.get("/list", interviewController.list);
router.get("/:interviewId", interviewController.detail);
router.delete("/:interviewId", interviewController.delete);

module.exports = router;
