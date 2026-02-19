const prisma = require("../prisma/client");
const bcrypt = require("bcrypt");

exports.createTeacherWithUser = async (req, res) => {
  try {
    const { name, email, password, campusId, maxPerDay, maxPerWeek } = req.body;

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res.status(400).json({ message: "Email already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: "TEACHER",
      },
    });

    const teacher = await prisma.teacher.create({
      data: {
        userId: user.id,
        campusId,
        maxPerDay,
        maxPerWeek,
      },
    });

    res.status(201).json({
  message: "Teacher created successfully",
  user: {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  },
  teacher,
});


  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to create teacher" });
  }
};
