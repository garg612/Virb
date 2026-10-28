import prisma from "../src/db/prisma.js";

const id = process.argv[2] ? Number(process.argv[2]) : 5;

async function main() {
  const call = await prisma.call.findUnique({ where: { id } });
  console.log(call);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
