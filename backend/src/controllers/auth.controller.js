const bcrypt = require("bcrypt");
const crypto = require("crypto");
const prisma = require("../prisma/client");
const { generateToken } = require("../utils/token");
const { sendPasswordResetEmail } = require("../services/email.service");

const RESET_TOKEN_EXPIRY_MINUTES = Number(process.env.RESET_TOKEN_EXPIRY_MINUTES || 60);

function hashResetToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

exports.signup = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const normalizedEmail = (email || "").trim().toLowerCase();

    if (!normalizedEmail) {
      return res.status(400).json({ message: "Email is required" });
    }

    const existingUser = await prisma.user.findFirst({
      where: {
        email: {
          equals: normalizedEmail,
          mode: "insensitive",
        },
      },
    });

    if (existingUser) {
      return res.status(400).json({ message: "Email already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const existingSystemAdmin = await prisma.user.findFirst({
      where: { role: "SYSTEM_ADMIN" },
      select: { id: true },
    });

    const assignedRole = existingSystemAdmin ? "INSTITUTION_OWNER" : "SYSTEM_ADMIN";

    const user = await prisma.user.create({
      data: {
        name,
        email: normalizedEmail,
        password: hashedPassword,
        role: assignedRole,
      },
    });

    const token = generateToken({
      id: user.id,
      role: user.role,
    });

    res.status(201).json({
      message: "Signup successful",
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        backendRole: user.role,
      },
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Signup failed" });
  }
};

exports.register = async (req, res) => {
  try {
    const { name, email, password, role = "admin" } = req.body;
    const normalizedEmail = (email || "").trim().toLowerCase();

    if (!normalizedEmail) {
      return res.status(400).json({ message: "Email is required" });
    }

    const existingUser = await prisma.user.findFirst({
      where: {
        email: {
          equals: normalizedEmail,
          mode: "insensitive",
        },
      },
    });

    if (existingUser) {
      return res.status(400).json({ message: "Email already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const userRole = role === "teacher" ? "TEACHER" : "INSTITUTION_OWNER";

    const user = await prisma.user.create({
      data: {
        name,
        email: normalizedEmail,
        password: hashedPassword,
        role: userRole,
      },
    });

    const token = generateToken({
      id: user.id,
      role: user.role,
    });

    res.status(201).json({
      message: "Registration successful",
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        backendRole: user.role,
      },
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Registration failed" });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const normalizedEmail = (email || "").trim().toLowerCase();

    if (!normalizedEmail || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const authenticatedUser = await prisma.user.findFirst({
      where: {
        email: {
          equals: normalizedEmail,
          mode: "insensitive",
        },
      },
    });

    if (!authenticatedUser) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, authenticatedUser.password);

    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const token = generateToken({
      id: authenticatedUser.id,
      role: authenticatedUser.role,
    });

    res.json({
      message: "Login successful",
      token,
      user: {
        id: authenticatedUser.id,
        name: authenticatedUser.name,
        email: authenticatedUser.email,
        role: authenticatedUser.role,
        backendRole: authenticatedUser.role,
      },
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Login failed" });
  }
};

exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const normalizedEmail = (email || "").trim().toLowerCase();

    if (!normalizedEmail) {
      return res.status(400).json({ message: "Email is required" });
    }

    const user = await prisma.user.findFirst({
      where: {
        email: {
          equals: normalizedEmail,
          mode: "insensitive",
        },
      },
      select: { id: true, email: true },
    });

    if (user) {
      const resetToken = crypto.randomBytes(32).toString("hex");
      const resetTokenHash = hashResetToken(resetToken);
      const resetPasswordExpiresAt = new Date(Date.now() + RESET_TOKEN_EXPIRY_MINUTES * 60 * 1000);

      await prisma.user.update({
        where: { id: user.id },
        data: {
          resetPasswordToken: resetTokenHash,
          resetPasswordExpiresAt,
        },
      });

      const frontendBaseUrl = (process.env.FRONTEND_URL || "http://localhost:5173").replace(/\/$/, "");
      const resetLink = `${frontendBaseUrl}/reset-password?token=${encodeURIComponent(resetToken)}`;

      try {
        await sendPasswordResetEmail({
          to: user.email,
          resetLink,
          expiresInMinutes: RESET_TOKEN_EXPIRY_MINUTES,
        });
      } catch (mailError) {
        console.error("Failed to send password reset email", mailError);
      }
    }

    res.json({ message: "If the email exists, password reset instructions have been sent." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Forgot password request failed" });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({ message: "Reset token and new password are required" });
    }

    if (String(newPassword).length < 8) {
      return res.status(400).json({ message: "New password must be at least 8 characters" });
    }

    const tokenHash = hashResetToken(String(token));

    const user = await prisma.user.findFirst({
      where: {
        resetPasswordToken: tokenHash,
        resetPasswordExpiresAt: {
          gt: new Date(),
        },
      },
      select: { id: true },
    });

    if (!user) {
      return res.status(400).json({ message: "Reset token is invalid or expired" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetPasswordToken: null,
        resetPasswordExpiresAt: null,
      },
    });

    return res.json({ message: "Password reset successful" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Reset password failed" });
  }
};

exports.changePassword = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { currentPassword, newPassword } = req.body;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "Current password and new password are required" });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Current password is incorrect" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedPassword,
        resetPasswordToken: null,
        resetPasswordExpiresAt: null,
      },
    });

    res.json({ message: "Password changed successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Change password failed" });
  }
};

exports.switchCampus = async (req, res) => {
  try {
    const userId = req.user?.id;
    const role = req.user?.role;
    const campusId = String(req.body?.campusId || "").trim();

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!campusId) {
      return res.status(400).json({ message: "campusId is required" });
    }

    const campus = await prisma.campus.findUnique({
      where: { id: campusId },
      select: { id: true },
    });

    if (!campus) {
      return res.status(404).json({ message: "Campus not found" });
    }

    const isGlobalRole = ["SYSTEM_ADMIN", "INSTITUTION_OWNER"].includes(role);

    if (!isGlobalRole) {
      const membership = await prisma.userCampus.findUnique({
        where: {
          userId_campusId: {
            userId,
            campusId,
          },
        },
        select: { id: true },
      });

      if (!membership) {
        return res.status(403).json({ message: "Access denied for selected campus" });
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { activeCampusId: campusId },
      select: {
        id: true,
        role: true,
        activeCampusId: true,
      },
    });

    return res.json({
      message: "Active campus switched successfully",
      user: updatedUser,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Failed to switch campus" });
  }
};
