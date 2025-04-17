const express = require("express");
const {
  registerUser,
  loginUser,
  checkAuth, // Import the checkAuth controller
} = require("../../controllers/auth-controller/index");
const authenticateMiddleware = require("../../middleware/auth-middleware");
const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.get("/check-auth", authenticateMiddleware, checkAuth);

module.exports = router;