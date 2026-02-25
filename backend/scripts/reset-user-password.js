require("dotenv").config();
const bcrypt = require("bcrypt");
const prisma = require("../src/prisma/client");

async function main() {
  const emailArg = process.argv[2];
  const newPassword = process.argv[3];

  const email = (emailArg || "").trim().toLowerCase();

  if (!email || !newPassword) {
    console.error("Usage: npm run reset:user-password -- <email> <newPassword>");
    process.exit(1);
  }

  const user = await prisma.user.findFirst({
    where: {
      email: {
        equals: email,
        mode: "insensitive",
      },
    },
    select: { id: true, email: true, role: true },
  });

  if (!user) {
    console.error(`User not found: ${email}`);
    process.exit(1);
  }

  const password = await bcrypt.hash(newPassword, 10);

  const updatedUser = await prisma.user.update({
    where: { id: user.id },
    data: { password },
    select: { id: true, email: true, role: true, isActive: true },
  });

  console.log("Password reset successful:");
  console.log(updatedUser);
}

main()
  .catch((error) => {
    console.error("Failed to reset password:", error.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
