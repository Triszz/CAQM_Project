const jwt = require("jsonwebtoken");
const User = require("../models/user.model");

const createToken = (_id) => {
  return jwt.sign({ _id }, process.env.JWT_SECRET, { expiresIn: "3d" });
};

const signup = async (req, res) => {
  try {
    const { username, email, password } = req.body;
    const user = await User.signup(username, email, password);
    const token = createToken(user._id);
    res.status(201).json({ _id: user._id, username, email, token });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.login(email, password);
    const token = createToken(user._id);
    res
      .status(200)
      .json({ _id: user._id, username: user.username, email, token });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const getUserInfo = async (req, res) => {
  try {
    const user = await User.getUserInfo(req.user._id);
    const { password, ...safeUserInfo } = user.toObject();
    res.status(200).json(safeUserInfo);
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
};
module.exports = {
  signup,
  login,
  getUserInfo,
};
