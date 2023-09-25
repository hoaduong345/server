"use strict";

const validator = require("validator");
const { PrismaClient } = require("@prisma/client");
const { error } = require("console");

const prisma = new PrismaClient();

const createVali = async (req, res, next) => {
  const { username, name, email, password, confirmpassword, phonenumber } =
    req.body;

  const error = {};

  const user_name = await prisma.user.findFirst({
    where: {
      username: username,
    },
  });
  const user_email = await prisma.user.findFirst({
    where: {
      email: email,
      
    },
  });

  if (user_name) {
    error.username = "Username is already exists!";
  }
  if (user_email) {
    error.email = "Email is already exists!";
  }
  if (!email) {
    error.email = "company_email_require";
  } else if (!validator.isEmail(email)) {
    error.email = "email_format";
  }
  if (!username) {
    error.username = "username_require";
  } else if (!validator.isLength(username, { min: 5, max: 20 })) {
    error.username = "username_length";
  } else if (!validator.isAlphanumeric(username)) {
    error.username = "username_format";
  }

  if (!name) {
    error.name = "name_require";
  } else if (!validator.isLength(name, { min: 5, max: 30 })) {
    error.name = "name_length";
  } else if (!validator.isAlphanumeric(name)) {
    error.name = "name_format";
  }

  if (!password) {
    error.password = "password_require";
  } else if (!validator.isLength(password, { min: 6, max: 20 })) {
    error.password = "password_length";
  }

  if (!confirmpassword) {
    error.confirmpassword = "confirm_password_require";
  } else if (!validator.equals(password, confirmpassword)) {
    error.confirmpassword = "confirm_password_must_match";
  }

  if (!phonenumber) {
    error.phonenumber = "Phone number is required";
  } else {
    // Define a regular expression pattern for a valid phone number.
    const phonePattern = /^0\d{9}$/; // This pattern assumes a 10-digit phone number.

    // Test the phone number against the pattern.
    if (!phonePattern.test(phonenumber)) {
      error.phonenumber = "Invalid phone number format";
    }
  }

  if (Object.keys(error).length > 0) {
    return res.status(400).json({ error });
  }
  req.username = username.toLowerCase().trim();
  req.password = password.trim();
  req.name = name.trim();
  req.email = email.toLowerCase().trim();
  req.phonenumber = phonenumber.trim();

  next();
};

const FogotPasswordValid = async (req, res, next) => {
  const { newPassword, confirmNewPassword } = req.body;
  const error = {};
  if (!newPassword) {
    error.newPassword = "password_require";
  } else if (!validator.isLength(newPassword, { min: 6, max: 20 })) {
    error.newPassword = "password_length";
  }

  if (!confirmNewPassword) {
    error.confirmNewPassword = "confirm_password_require";
  } else if (!validator.equals(newPassword, confirmNewPassword)) {
    error.confirmNewPassword = "confirm_password_must_match";
  }

  if (Object.keys(error).length > 0) {
    return res.status(400).json({ error });
  }
  req.newPassword = newPassword.trim();
  next();
};

const ResetPasswordValid = async (req, res, next) => {
const { oldPassword, newPassword, confirmNewPassword } = req.body;
  const error = {};
  if (!oldPassword) {
    error.newPassword = "password_require";
  } else if (!validator.isLength(oldPassword, { min: 6, max: 20 })) {
    error.newPassword = "password_length";
  }

  if (!newPassword) {
    error.newPassword = "password_require";
  } else if (!validator.isLength(newPassword, { min: 6, max: 20 })) {
    error.newPassword = "password_length";
  }

  if (!confirmNewPassword) {
    error.confirmNewPassword = "confirm_password_require";
  } else if (!validator.equals(newPassword, confirmNewPassword)) {
    error.confirmNewPassword = "confirm_password_must_match";
  }

  if (Object.keys(error).length > 0) {
    return res.status(400).json({ error });
  }
  req.oldPassword = oldPassword.trim();
  req.newPassword = newPassword.trim();

  next();
};
module.exports = {
  createVali,
  ResetPasswordValid,
  FogotPasswordValid,
};