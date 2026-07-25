import { db, pool } from "./src/index";
import { sql } from "drizzle-orm";

async function main() {
  await db.execute(sql`ALTER TABLE "content_posts" DROP COLUMN IF EXISTS "title_reference";`);
  await db.execute(sql`ALTER TABLE "content_posts" DROP COLUMN IF EXISTS "reference_link";`);
  await db.execute(sql`ALTER TABLE "content_posts" DROP COLUMN IF EXISTS "script_or_ideation";`);
  console.log("Cols dropped");
  process.exit(0);
}
main().catch(console.error);
