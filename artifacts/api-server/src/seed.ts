import { db } from "@workspace/db";
import { users, agencySettings } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcrypt";
import { createId } from "@paralleldrive/cuid2";

async function seed() {
  console.log("Seeding database...");

  const existing = await db.query.users.findFirst({
    where: eq(users.email, "admin@agencyos.com"),
  });

  if (!existing) {
    const passwordHash = await bcrypt.hash("Admin@123", 10);
    await db.insert(users).values({
      id: createId(),
      email: "admin@agencyos.com",
      passwordHash,
      name: "Super Admin",
      systemRole: "SUPER_ADMIN",
      isActive: true,
    });
    console.log("✓ Admin user created: admin@agencyos.com / Admin@123");
  } else {
    console.log("✓ Admin user already exists");
  }

  const settings = await db.query.agencySettings.findFirst({
    where: eq(agencySettings.id, "default"),
  });

  if (!settings) {
    await db.insert(agencySettings).values({
      id: "default",
      agencyName: "Blink Beyond",
      primaryColor: "#6366f1",
      currency: "INR",
      taxLabel: "GST",
      taxPercent: 18,
      workDayStart: "09:00",
      workDayEnd: "18:00",
    });
    console.log("✓ Agency settings created");
  }

  console.log("Seeding complete!");
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
