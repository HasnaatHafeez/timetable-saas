const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {

  console.log("Clearing database...");

  await prisma.timetable.deleteMany();
  await prisma.teacherAvailability.deleteMany();
  await prisma.teacherSubject.deleteMany();
  await prisma.teacher.deleteMany();
  await prisma.subject.deleteMany();
  await prisma.department.deleteMany();
  await prisma.section.deleteMany();
  await prisma.academicLevel.deleteMany();
  await prisma.timeSlot.deleteMany();
  await prisma.workingDay.deleteMany();
  await prisma.room.deleteMany();
  await prisma.campus.deleteMany();
  await prisma.institution.deleteMany();

  console.log("Creating Institution...");

  const institution = await prisma.institution.create({
    data: {
      name: "Demo University",
      type: "UNIVERSITY",
      ownerId: "demo-owner"
    }
  });

  const campus = await prisma.campus.create({
    data: {
      name: "Main Campus",
      location: "Lahore",
      institutionId: institution.id
    }
  });

  const department = await prisma.department.create({
    data: {
      name: "Computer Science",
      campusId: campus.id
    }
  });

  const subject = await prisma.subject.create({
    data: {
      name: "Data Structures",
      type: "THEORY",
      weeklyHours: 3,
      departmentId: department.id
    }
  });

  console.log("Seed completed successfully.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });