require("dotenv").config({
  path: ".env.local",
  override: true
});

const { PrismaClient } = require("@prisma/client");
const { spawnSync } = require("child_process");
const path = require("path");
const readline = require("readline");
const db = new PrismaClient();

const KEEP = "GYMHH6LL";

async function main() {
  const orders = await db.order.findMany({
    select: {
      id: true,
      customerName: true,
      status: true,
      ghnOrderCode: true
    }
  });

  const keep = orders.filter(
    o => o.ghnOrderCode === KEEP
  );
  const remove = orders.filter(
    o => o.ghnOrderCode !== KEEP
  );

  if (keep.length !== 1) {
    throw new Error(
      `Không tìm thấy chính xác một đơn ${KEEP}. Dừng xóa.`
    );
  }

  console.log("\n===== GIU LAI =====");
  console.table(keep);

  console.log("\n===== DU KIEN XOA KHOI AURA OPS =====");
  console.table(remove.map(o => ({
    id: o.id,
    status: o.status,
    ghn: o.ghnOrderCode || "CHUA CO MA"
  })));

  console.log("SO DON XOA:", remove.length);
  console.log(
    "GHN_REVIEW:",
    remove.filter(o => o.status === "GHN_REVIEW").length
  );

  // Sao luu SQLite truc tiep, bao gom du lieu chua chot WAL.
  const url = process.env.DATABASE_URL || "";
  if (!url.startsWith("file:")) {
    throw new Error("DATABASE_URL không phải SQLite file");
  }

  const name = decodeURIComponent(url.slice(5).split("?")[0]);
  const databasePath = path.isAbsolute(name)
    ? name
    : path.resolve("prisma", name);

  const backup = databasePath + ".before-cleanup-" +
    new Date().toISOString().replace(/[:.]/g, "-");

  const result = spawnSync("python3", [
    "-c",
    "import sqlite3,sys; a=sqlite3.connect(sys.argv[1]); b=sqlite3.connect(sys.argv[2]); a.backup(b); b.close(); a.close()",
    databasePath,
    backup
  ], { encoding: "utf8" });

  if (result.status !== 0) {
    throw new Error("Sao lưu thất bại: " + result.stderr);
  }

  console.log("\nDA SAO LUU:", backup);
  console.log(
    "CANH BAO: GHN_REVIEW co the co van don da tao " +
    "nhung chua luu ma. Hay doi soat GHN truoc khi xoa."
  );

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const answer = await new Promise(resolve =>
    rl.question(
      "\nDa doi soat GHN? Nhap XOA TEST de xac nhan: ",
      resolve
    )
  );
  rl.close();

  if (answer !== "XOA TEST") {
    console.log("DA HUY. Chua xoa don nao.");
    return;
  }

  const ids = remove.map(o => o.id);

  const resultDelete = await db.order.deleteMany({
    where: { id: { in: ids } }
  });

  console.log("DA XOA:", resultDelete.count);
  console.log("DA GIU DON GHN:", KEEP);
}

main()
  .catch(e => {
    console.error("LOI:", e.message);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
