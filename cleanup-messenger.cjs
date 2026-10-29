require("dotenv").config({
  path: ".env.local",
  override: true
});

const { PrismaClient } = require("@prisma/client");
const { spawnSync } = require("child_process");
const readline = require("readline");
const path = require("path");

const db = new PrismaClient();

async function main() {
  const messages = await db.message.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      text: true,
      createdAt: true,
      pageId: true,
      senderId: true,
      isEcho: true
    }
  });

  // Chi giu tin nhan chot don cua Khanh Van.
  const keep = messages.filter(m =>
    /Họ\s*tên\s*[:：]\s*Khánh\s*Vân\b/i.test(m.text)
  );

  console.log("\n===== TIN NHAN KHANH VAN =====");
  console.table(keep.map(m => ({
    id: m.id,
    time: m.createdAt,
    text: m.text.slice(0, 80)
  })));

  console.log("Tong tin:", messages.length);
  console.log("Tin Khanh Van:", keep.length);

  if (keep.length !== 2) {
    throw new Error(
      "Khong tim thay dung 2 tin Khanh Van. " +
      "Chua xoa du lieu."
    );
  }

  const url = process.env.DATABASE_URL || "";
  if (!url.startsWith("file:")) {
    throw new Error("DATABASE_URL khong hop le");
  }

  const name = decodeURIComponent(url.slice(5).split("?")[0]);
  const databasePath = path.isAbsolute(name)
    ? name
    : path.resolve("prisma", name);

  const backup = databasePath +
    ".before-message-cleanup-" +
    new Date().toISOString().replace(/[:.]/g, "-");

  const result = spawnSync("python3", [
    "-c",
    "import sqlite3,sys; a=sqlite3.connect(sys.argv[1]); b=sqlite3.connect(sys.argv[2]); a.backup(b); b.close(); a.close()",
    databasePath,
    backup
  ], { encoding: "utf8" });

  if (result.status !== 0) {
    throw new Error("Khong sao luu duoc: " + result.stderr);
  }

  console.log("Da sao luu:", backup);

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const answer = await new Promise(resolve =>
    rl.question(
      "\nNhap XOA TIN TEST de xoa cac tin khac: ",
      resolve
    )
  );
  rl.close();

  if (answer !== "XOA TIN TEST") {
    console.log("Da huy. Khong xoa tin nao.");
    return;
  }

  const resultDelete = await db.message.deleteMany({
    where: {
      id: {
        notIn: keep.map(m => m.id)
      }
    }
  });

  console.log("Da xoa:", resultDelete.count);
  console.log("Da giu:", keep.length, "tin Khanh Van");
}

main()
  .catch(e => {
    console.error("LOI:", e.message);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
