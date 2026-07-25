import { db } from "@workspace/db";
import { eq } from "drizzle-orm";

interface SyncConfig {
  parentTable: any;
  childTable: any;
  foreignKeyField: string; // e.g. "purchaseOrderId"
  payloadKeys: string[]; // e.g. ["lineItems", "items"]
  mapItem: (item: any, parentId: string) => any;
}

export async function syncParentInsert(
  config: SyncConfig,
  parentValues: any,
  payloadBody: any
) {
  // Extract items array if explicitly provided
  let itemsArray: any[] | undefined = undefined;
  for (const key of config.payloadKeys) {
    if (Array.isArray(payloadBody[key])) {
      itemsArray = payloadBody[key];
      break;
    }
  }

  // Filter out the payload keys from parentValues if they are not columns on the parent table
  const filteredParentValues = { ...parentValues };
  for (const key of config.payloadKeys) {
    if (!config.parentTable[key]) {
      delete filteredParentValues[key];
    }
  }

  return await db.transaction(async (tx) => {
    // 1. Insert parent
    const [insertedParent] = await tx
      .insert(config.parentTable)
      .values(filteredParentValues)
      .returning();

    if (!insertedParent) {
      throw new Error("Failed to insert parent record");
    }

    // 2. If items are provided, insert them
    if (itemsArray !== undefined) {
      const parentId = insertedParent.id;
      const childRows = itemsArray.map((item) => config.mapItem(item, parentId));
      if (childRows.length > 0) {
        await tx.insert(config.childTable).values(childRows);
      }
    }

    return insertedParent;
  });
}

export async function syncParentUpdate(
  config: SyncConfig,
  parentId: string,
  updateValues: any,
  payloadBody: any
) {
  // Extract items array if explicitly provided
  let itemsArray: any[] | undefined = undefined;
  for (const key of config.payloadKeys) {
    if (Array.isArray(payloadBody[key])) {
      itemsArray = payloadBody[key];
      break;
    }
  }

  // Filter out the payload keys from updateValues if they are not columns on the parent table
  const filteredUpdateValues = { ...updateValues };
  for (const key of config.payloadKeys) {
    if (!config.parentTable[key]) {
      delete filteredUpdateValues[key];
    }
  }

  return await db.transaction(async (tx) => {
    // 1. Update parent
    const [updatedParent] = await tx
      .update(config.parentTable)
      .set(filteredUpdateValues)
      .where(eq(config.parentTable.id, parentId))
      .returning();

    if (!updatedParent) {
      throw new Error("Parent record not found for update");
    }

    // 2. If items are provided, replace existing items
    if (itemsArray !== undefined) {
      // Delete existing
      await tx
        .delete(config.childTable)
        .where(eq(config.childTable[config.foreignKeyField], parentId));

      // Insert new
      const childRows = itemsArray.map((item) => config.mapItem(item, parentId));
      if (childRows.length > 0) {
        await tx.insert(config.childTable).values(childRows);
      }
    }

    return updatedParent;
  });
}
