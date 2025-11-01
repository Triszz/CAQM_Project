const express = require("express");
const router = express.Router();
const {
  signup,
  login,
  getUserInfo,
} = require("../controllers/user.controller");
const requireAuth = require("../middlewares/requireAuth");

router.post("/signup", signup);
router.post("/login", login);

router.use(requireAuth);
router.get("/user-info", getUserInfo);
module.exports = router;
