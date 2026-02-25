require("dotenv").config();
const prisma = require("../src/prisma/client");

async function main() {
  const email = process.argv[2];

  if (!email) {
    console.error("Usage: npm run promote:system-admin -- <email>");
    process.exit(1);
  }

  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    console.error(`User not found: ${email}`);
    process.exit(1);
  }

  const updatedUser = await prisma.user.update({
    where: { email },
    data: { role: "SYSTEM_ADMIN" },
    select: { id: true, name: true, email: true, role: true, isActive: true },
  });

  console.log("User promoted to SYSTEM_ADMIN:");
  console.log(updatedUser);
}

main()
  .catch((error) => {
    console.error("Failed to promote user:", error.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
