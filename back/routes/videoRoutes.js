const express = require("express");
const router = express.Router();
const videoController = require("../controllers/videoController");
const upload = require("../config/multer");

router.post("/upload", upload.single("video"), videoController.upload);
router.get("/stream/:videoId", videoController.stream);
router.post("/analyze", videoController.analyze);

module.exports = router;
