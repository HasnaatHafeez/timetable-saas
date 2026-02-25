const bcrypt = require("bcrypt");
const prisma = require("../prisma/client");
const { generateToken } = require("../utils/token");

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

    const users = await prisma.user.findMany({
      where: {
        email: {
          equals: normalizedEmail,
          mode: "insensitive",
        },
      },
    });

    if (!users.length) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    let authenticatedUser = null;
    for (const candidate of users) {
      const isMatch = await bcrypt.compare(password, candidate.password);
      if (isMatch) {
        authenticatedUser = candidate;
        break;
      }
    }

    if (!authenticatedUser) {
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

    await prisma.user.findFirst({
      where: {
        email: {
          equals: normalizedEmail,
          mode: "insensitive",
        },
      },
      select: { id: true },
    });

    res.json({ message: "If the email exists, password reset instructions have been sent." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Forgot password request failed" });
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
      data: { password: hashedPassword },
    });

    res.json({ message: "Password changed successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Change password failed" });
  }
};
