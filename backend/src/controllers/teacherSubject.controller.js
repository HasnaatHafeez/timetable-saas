const prisma = require("../prisma/client");

exports.assignSubjectToTeacher = async (req, res) => {
  try {
    const { teacherId, subjectId } = req.body;

    const mapping = await prisma.teacherSubject.create({
      data: {
        teacherId,
        subjectId,
      },
    });

    res.status(201).json({
      message: "Subject assigned to teacher successfully",
      mapping,
    });

  } catch (error) {
  console.error(error);
  res.status(500).json({
    message: "Failed to assign subject",
    error: error.message
  });
}
};
