const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const validator = require("validator");

const UserSchema = mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Instance method

// Statics method
UserSchema.statics.signup = async function (username, email, password) {
  if (!username || !email || !password) {
    throw Error("All fields must be filled!");
  }
  if (!validator.isEmail(email)) {
    throw Error("Email is not valid!");
  }
  if (!validator.isStrongPassword(password)) {
    throw Error("Password is not strong enough!");
  }

  const existingEmail = await this.findOne({ email });
  if (existingEmail) {
    throw Error("Email is existing, please try another email!");
  }

  const salt = await bcrypt.genSalt(10);
  const hashPassword = await bcrypt.hash(password, salt);
  const user = await this.create({
    username,
    email,
    password: hashPassword,
  });
  return user;
};

UserSchema.statics.login = async function (email, password) {
  if (!email || !password) {
    throw Error("All fields must be filled!");
  }
  if (!validator.isEmail(email)) {
    throw Error("Email is not valid!");
  }

  const user = await this.findOne({ email });
  if (!user) {
    throw Error("Email or password is incorrect! Please try again.");
  }

  const isCorrectPassword = await bcrypt.compare(password, user.password);
  if (!isCorrectPassword) {
    throw Error("Email or password is incorrect! Please try again.");
  }
  return user;
};

UserSchema.statics.getUserInfo = async function (id) {
  const user = await this.findOne({ _id: id });
  if (!user) {
    throw Error("User not found!");
  }
  return user;
};
const User = mongoose.model("User", UserSchema);
module.exports = User;
