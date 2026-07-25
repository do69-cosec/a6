import { createError } from "../middleware/errorHandler";

export interface ValidationConfig {
  uuids?: string[];
  dates?: string[]; // timestamp columns (convert to Date object)
  textDates?: string[]; // text columns (keep as ISO string or validated string)
  numbers?: string[];
  enums?: Record<string, readonly string[] | string[]>;
}

const UUID_REGEX = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

export function isValidUUID(val: string | null | undefined): boolean {
  if (!val) return false;
  return UUID_REGEX.test(val);
}

/**
 * Sanitizes and validates standard payload fields before they are written to the database.
 * If any validation fails, it throws a 400 Bad Request error.
 */
export function sanitizeAndValidate(body: any, config: ValidationConfig = {}): any {
  if (!body || typeof body !== "object") {
    return body;
  }

  const result = { ...body };

  // 1. Map empty strings, "null" string, or undefined to null globally for clean storage
  for (const key of Object.keys(result)) {
    const val = result[key];
    if (val === "" || val === "null" || val === "undefined") {
      result[key] = null;
    }
  }

  // 2. Validate UUID fields (e.g. clientId, projectId, assigneeId, etc.)
  if (config.uuids) {
    for (const key of config.uuids) {
      const val = result[key];
      if (val !== undefined && val !== null) {
        if (!UUID_REGEX.test(String(val))) {
          throw createError(`Invalid UUID format for field: ${key}`, 400, undefined, key);
        }
      }
    }
  }

  // 3. Normalize and validate Date fields (timestamp database columns)
  if (config.dates) {
    for (const key of config.dates) {
      const val = result[key];
      if (val !== undefined && val !== null) {
        const d = new Date(val);
        if (isNaN(d.getTime())) {
          throw createError(`Invalid timestamp/date syntax for field: ${key}`, 400, undefined, key);
        }
        result[key] = d;
      }
    }
  }

  // 4. Validate Text-based Date fields (text database columns, like 'YYYY-MM-DD')
  if (config.textDates) {
    for (const key of config.textDates) {
      const val = result[key];
      if (val !== undefined && val !== null) {
        const d = new Date(val);
        if (isNaN(d.getTime())) {
          throw createError(`Invalid date syntax for field: ${key}`, 400, undefined, key);
        }
        // Save as date ISO string or the validated input string
        result[key] = String(val);
      }
    }
  }

  // 5. Convert and validate numeric fields
  if (config.numbers) {
    for (const key of config.numbers) {
      const val = result[key];
      if (val !== undefined && val !== null) {
        const n = Number(val);
        if (isNaN(n) || !Number.isFinite(n)) {
          throw createError(`Invalid numeric value for field: ${key}`, 400, undefined, key);
        }
        result[key] = n;
      }
    }
  }

  // 6. Validate enum fields against allowed options (with normalization support)
  if (config.enums) {
    for (const [key, allowedValues] of Object.entries(config.enums)) {
      const val = result[key];
      if (val !== undefined && val !== null) {
        const valStr = String(val);
        const normalizedVal = valStr.trim().toUpperCase().replace(/[\s-]+/g, "_");
        
        // Match either the direct value or normalized value
        if (allowedValues.includes(valStr)) {
          result[key] = valStr;
        } else if (allowedValues.includes(normalizedVal)) {
          result[key] = normalizedVal;
        } else {
          throw createError(
            `Invalid value '${valStr}' for '${key}'. Allowed values are: ${allowedValues.join(", ")}`,
            400,
            undefined,
            key
          );
        }
      }
    }
  }

  return result;
}

export function validateLineItems(body: any, moduleName: string): void {
  if (!body || typeof body !== "object") return;
  const payloadKeys = ["lineItems", "items"];
  let itemsArray: any[] | undefined = undefined;
  for (const key of payloadKeys) {
    if (Array.isArray(body[key])) {
      itemsArray = body[key];
      break;
    }
  }

  if (itemsArray !== undefined) {
    for (let i = 0; i < itemsArray.length; i++) {
      const item = itemsArray[i];
      if (!item || typeof item !== "object") {
        throw createError(`Invalid item format at index ${i} in ${moduleName}`, 400);
      }

      const fieldsToCheck = ["qty", "unitPrice", "taxPercent", "discount", "totalPrice", "subtotal"];
      for (const field of fieldsToCheck) {
        if (item[field] !== undefined && item[field] !== null) {
          const rawVal = item[field];
          if (rawVal === "" || rawVal === "null" || rawVal === "undefined") {
            if (field === "qty" || field === "unitPrice" || (moduleName === "Proposals" && field === "totalPrice")) {
              throw createError(`Required child item field '${field}' is missing or empty at index ${i} in ${moduleName}`, 400);
            }
            continue;
          }
          const n = Number(rawVal);
          if (isNaN(n) || !Number.isFinite(n)) {
            throw createError(`Invalid numeric value for child item field '${field}' at index ${i} in ${moduleName}`, 400);
          }
        } else {
          if (field === "qty" || field === "unitPrice" || (moduleName === "Proposals" && field === "totalPrice")) {
            throw createError(`Required child item field '${field}' is missing or empty at index ${i} in ${moduleName}`, 400);
          }
        }
      }
    }
  }
}
