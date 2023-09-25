const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
const SendEmail = require("../utils/sendEmail");
const crypto = require("crypto");
const decode = require("jwt-decode");
const { re } = require("mathjs");
dotenv.config();

const AuthController = {
  // GENERATE ACCESS TOKEN
  genereateAccessToken: (email) => {
    return jwt.sign(
      {
        email: email,
      },
      process.env.SECRECT_KEY,
      { expiresIn: "1h" }
    );
  },
  // GENERATE REFRESH TOKEN
  genereateRefreshToken: (email) => {
    return jwt.sign(
      {
        id: email.id,
      },
      process.env.JWT_REFRESH_TOKEN,
      { algorithm: "HS256" },
      { expiresIn: "365d" }
    );
  },
  generateForgotPasswordToken: (email) => {
    return jwt.sign(
      {
        email: email,
      },
      process.env.JWT_FORGOT_PASSWORD_TOKEN,
      { algorithm: "HS256" },
      { expiresIn: "15m" }
    );
  },
  // REGISTER
  register: async (req, res) => {
    try {
      const salt = await bcrypt.genSalt(10);
      if (!req.body.password || !salt) {
        throw new Error("Missing password or salt");
      }

      const hashed = await bcrypt.hash(req.body.password, salt);

      const newUser = {
        email: req.body.email,
        username: req.body.username,
        password: hashed,
        name: req.body.name,
        phonenumber: req.body.phonenumber,
      };

      const user = await prisma.user.create({
        data: newUser,
      });
      const token = await prisma.token.create({
        data: {
          userid: user.id,
          token: crypto.randomBytes(32).toString("hex"),
        },
      });

      const url = `${process.env.BASE_URL_FORGOTPASSWORD}/buyzzle/auth/${user.id}/verify/${token.token}`;
      // await SendEmail(user.email, "Verify email", url);
      console.log("🚀 ~ file: AuthController.js:83 ~ register: ~ url:", url);

      console.log("Email URL: " + url);
      res
        .status(200)
        .send(
          "Register Successfully, Please check Email to verify your account"
        );
    } catch (error) {
      console.log("error", error);
    }
  },

  deleteregister: async (req, res) => {
    try {
      const registerId = parseInt(req.params.id);
      const existingUser = await prisma.user.findUnique({
        where: {
          id: registerId,
        },
        include: {
          Token: true,
        },
      });

      if (!existingUser) {
        return res.status(404).json("User không tồn tại");
      }

      if (existingUser.Token.length > 0) {
        await prisma.token.deleteMany({
          where: {
            userid: registerId,
          },
        });
      }
      await prisma.user.delete({
        where: {
          id: registerId,
        },
      });

      res.status(200).json("Xóa User thành công");
    } catch (error) {
      console.error(error);
      res.status(500).json(error.message);
    }
  },

  UserProfile: async (req, res) => {
    try {
      const userId = parseInt(req.params.id);

      const updatedUser = {
        email: req.body.email,
        username: req.body.username,
        name: req.body.name,
        phonenumber: req.body.phonenumber,
        sex: req.body.sex,
        dateOfBirth: new Date(req.body.dateOfBirth),
      };

      const updatedUserResponse = await prisma.user.update({
        where: {
          id: userId,
        },
        data: updatedUser,
      });

      res.status(200).json("Lưu hồ sơ thành công");
    } catch (error) {
      console.error(error);
      res.status(500).json(error.message);
    }
  },

  UpdatePassword: async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const oldPassword = req.body.oldPassword;
      const newPassword = req.body.newPassword;
      const newPasswordConfirmation = req.body.newPasswordConfirmation;

      if (newPassword !== newPasswordConfirmation) {
        return res
          .status(400)
          .json("Mật khẩu mới và xác nhận mật khẩu không khớp");
      }

      const user = await prisma.user.findUnique({
        where: {
          id: userId,
        },
      });

      // Xác thực mật khẩu cũ
      const isPasswordValid = await bcrypt.compare(oldPassword, user.password);

      if (!isPasswordValid) {
        return res.status(401).json("Mật khẩu cũ không chính xác");
      }

      // Mật khẩu cũ hợp lệ, tiến hành cập nhật mật khẩu mới
      const hashedNewPassword = await bcrypt.hash(newPassword, 10);

      const updatePassword = await prisma.user.update({
        where: {
          id: userId,
        },
        data: {
          password: hashedNewPassword, // Lưu mật khẩu mới đã mã hóa
        },
      });

      res.status(200).json("Cập nhật mật khẩu thành công");
    } catch (error) {
      res.status(500).json(error.message);
    }
  },

  // LOGIN
  login: async (req, res) => {
    try {
      const reqpassword = req.body.password;

      const user = await prisma.user.findFirst({
        where: { email: req.body.email },
      });
      if (!user) {
        return res.status(404).json("wrong email");
      }
      const validPassword = await bcrypt.compare(reqpassword, user.password);

      if (!validPassword) {
        return res.status(404).json("wrong password");
      }

      if (user.verify == false) {
        const token = await prisma.token.findUnique({
          where: { tokenid: user.id },
        });
        if (!token) {
          token = await prisma.token.create({
            id: user.id,
            token: crypto.randomBytes(32).toString("hex"),
          });

          const url = `${process.env.BASE_URL}user/${user.id}/verify/${token.token}`;

          await SendEmail(user.email, "Verify email", url);
        }
        return res.status(400).send({
          message: "An email has sent to your email, please check that",
        });
      }

      if (user.email && validPassword) {
        const accessToken = AuthController.genereateAccessToken(user.email);
        const refreshToken = AuthController.genereateRefreshToken(user.email);
        if (!user.refresh_token) {
          // Save refresh token to the user's record in the database
          await prisma.user.update({
            where: { id: user.id },
            data: { refresh_token: refreshToken },
          });
        }

        res.cookie("refreshToken", refreshToken, {
          httpOnlyCookie: true,
          secure: false,
          path: "/",
          sameSite: "strict",
        });
        res.cookie("accessToken", accessToken, {
          httpOnlyCookie: true,
          secure: false,
          path: "/",
          sameSite: "strict",
        });
        res.cookie("id", user.id, {
          httpOnlyCookie: true,
          secure: false,
          path: "/",
          sameSite: "strict",
        });
        const { password, ...others } = user;
        console.log("Login successfully");
        return res.status(200).json({ ...others, accessToken });
      }
    } catch (error) {
      console.log(error.message)
      return res.status(500).json(error.message);
    }
  },

  // RESET PASSWORD

  resetPassword: async (req, res) => {
    try {
      const token = req.params.token;
      const decodedBase64 = Buffer.from(token, "base64").toString("utf-8");
      const decoded = decode(decodedBase64);
      const salt = await bcrypt.genSalt(10);
      if (!req.body.newPassword || !salt) {
        throw new Error("Missing password or salt");
      }
      const hashed = await bcrypt.hash(req.body.newPassword, salt);
      await prisma.user.update({
        where: {
          email: decoded.email,
        },
        data: {
          password: hashed,
        },
      });

      await prisma.user.update({
        where: {
          email: decoded.email,
        },
        data: {
          forgotpassword_token: null,
        },
      });
      res.status(200).send("Change password successfully");
    } catch (error) {
      res.status(500).send("Something when Wrong");
    }
  },

  // SEND EMAIL TO FORGOT PASSWORD
  forgotPassword: async (req, res) => {
    try {
      const reqemail = req.body.email;

      const user = await prisma.user.findUnique({
        where: {
          email: reqemail,
        },
      });

      if (!user) {
        return res.status(404).send("Email is not found");
      }

      if (!user.verify) {
        return res
          .status(400)
          .send("Your account is not verified. Please check your Email");
      }

      if (user.forgotpassword_token == null) {
        const forgot_pasword_token_JWT =
          AuthController.generateForgotPasswordToken(user.email);
        console.log("jwt", forgot_pasword_token_JWT);
        const forgot_password_token_base64 = Buffer.from(
          forgot_pasword_token_JWT
        ).toString("base64");
        console.log("Base64", forgot_password_token_base64);
        await prisma.user.update({
          where: {
            email: user.email,
          },
          data: {
            forgotpassword_token: forgot_password_token_base64,
          },
        });
        const url = `${process.env.BASE_URL}/buyzzle/auth/resetpassword/${forgot_password_token_base64}`;
        console.log("Generated URL:", url);
      } else {
        const url = `${process.env.BASE_URL}/buyzzle/auth/resetpassword/${user.forgotpassword_token}`;
        console.log("Generated URL:", url);
      }

      // await SendEmail(user.email, "Forgot Password", url);

      res.status(200).send("A Link has sent to your email");
    } catch (error) {
      console.error(error);
      res.status(500).send("Internal server error");
    }
  },

  // REQUEST REFRESH AND ACCESS TOKEN
  requestRefreshToken: async (req, res) => {
    // take refresh token from user
    const refreshToken = req.cookies.refreshToken;
    if (!refreshToken) return res.status(401).json("You are not authenticated");
    jwt.verify(refreshToken, process.env.JWT_REFRESH_TOKEN, (err, email) => {
      if (err) {
        console.log(err);
      }
      // create new access token, refresh token
      const newAccesstoken = AuthController.genereateAccessToken(email);
      const newRefrestoken = AuthController.genereateRefreshToken(email);
    });
    res.status(200).json({ accessToken: newAccesstoken });
  },

  // VERIFY ACCOUNT WHEN REGISTER WITH EMAIL
  verify: async (req, res) => {
    try {
      const userID = parseInt(req.params.id);
      const reqToken = req.params.token;

      const user = await prisma.user.findUnique({
        where: { id: userID },
      });

      if (!user) return res.status(400).send({ message: "invalid link" });

      const token = await prisma.token.findFirst({
        where: {
          userid: user.id,
          token: reqToken,
        },
      });
      if (!token) {
        return res.status(400).send({ message: "Invalid token" });
      }
      await prisma.user.update({
        where: { id: userID },
        data: { verify: true },
      });
      const tokenId = parseInt(token.id);

      await prisma.token.delete({
        where: {
          userid: userID,
          id: tokenId,
        },
      });
      res.status(200).send({ message: "Email verified successfully" });
    } catch (error) {
      console.log(error);
      res.status(500).send({ message: "Internal server error" });
    }
  },
  //CHANGE PASSWORD
  changePassword: async (req, res) => {
    try {
      const accessToken = req.cookies.accessToken;
      const token = decode(accessToken);

      const user = await prisma.user.findUnique({
        where: {
          email: token.email,
        },
      });
      const isValidPassword = await bcrypt.compare(
        req.body.oldPassword,
        user.password
      );

      if (!isValidPassword) {
        return res.status(404).send("Old Password is not valid");
      }

      const salt = await bcrypt.genSalt(10);
      if (!req.body.newPassword || !salt) {
        throw new Error("Missing password or salt");
      }
      const hashed = await bcrypt.hash(req.body.newPassword, salt);

      await prisma.user.update({
        where: {
          email: token.email,
        },
        data: {
          password: hashed,
        },
      });
      const refreshTokenPayload = {
        email: token.email,
      };
      const newRefreshToken = jwt.sign(
        refreshTokenPayload,
        process.env.JWT_REFRESH_TOKEN,
        {
          expiresIn: token.exp - Math.floor(Date.now() / 1000), // Calculate the remaining time of the old token
        }
      );

      await prisma.user.update({
        where: {
          email: token.email,
        },
        data: {
          password: hashed,
          refreshToken: newRefreshToken,
        },
      });
      res.status(200).send("Change Password Successfully");
    } catch (error) {
      res.status(404).send("Change Password Failed");
    }
  },
  // LOG OUT
  logout: async (req, res) => {
    try {
      const accessToken = req.cookies.accessToken;
      const token = decode(accessToken);

      const user = await prisma.user.update({
        where: {
          email: token.email,
        },
        data: {
          refresh_token: null,
        },
      });
      console.log("user", user);
      res.clearCookie("refreshToken");
      res.clearCookie("accessToken");
      // localStorage.clear();
      res.status(200).send("Logged out successfully");
    } catch (error) {
      res.status(500).send("Logout failed");
    }
  },
};
module.exports = AuthController;
