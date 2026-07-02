import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function check() {
  const users = await prisma.userProfile.findMany();
  console.log(users);
}
check();
