import { zValidator } from "@hono/zod-validator";
import type { ValidationTargets } from "hono";
import { z } from "zod";

import { planets } from "./planets";
import {
  AGENCIES,
  MISSION_SORTABLE_FIELDS,
  MISSION_STATUSES,
  PLANET_TYPES,
  SORTABLE_FIELDS,
} from "./types";

const planetIds = planets.map((p) => p.id);

const planetId = z
  .string()
  .toLowerCase()
  .refine((id) => planetIds.includes(id), {
    error: `expected one of: ${planetIds.join(", ")}`,
  });

// "field" sorts ascending, "-field" sorts descending
const sort = <const T extends readonly string[]>(fields: T) =>
  z
    .string()
    .refine((value) => fields.includes(value.replace(/^-/, "")), {
      error: `expected one of: ${fields.join(", ")} (prefix with - for descending order)`,
    })
    .transform((value) => ({
      field: value.replace(/^-/, "") as T[number],
      descending: value.startsWith("-"),
    }));

export const planetsQuerySchema = z.object({
  type: z.enum(PLANET_TYPES).optional(),
  hasRings: z
    .enum(["true", "false"])
    .transform((value) => value === "true")
    .optional(),
  sort: sort(SORTABLE_FIELDS).optional(),
});

export const missionsQuerySchema = z.object({
  planet: planetId.optional(),
  agency: z.enum(AGENCIES).optional(),
  status: z.enum(MISSION_STATUSES).optional(),
  sort: sort(MISSION_SORTABLE_FIELDS).optional(),
});

export const travelEstimationSchema = z.object({
  from: planetId,
  to: planetId,
  speedKmPerSecond: z.number().positive(),
});

// Validates the incoming data with a zod schema and answers in the API
// envelope when it does not match:
// - 400 when the request is malformed: invalid query parameter, or a body
//   with a missing field or a field of the wrong type
// - 422 when the body is well-formed but a value cannot be processed
export const validate = <
  Target extends keyof ValidationTargets,
  Schema extends z.ZodType,
>(
  target: Target,
  schema: Schema,
) =>
  zValidator(target, schema, (result, c) => {
    if (!result.success) {
      const error = result.error.issues
        .map((issue) => {
          const field = issue.path.join(".") || target;
          return `Invalid ${field}: ${issue.message}`;
        })
        .join("; ");
      const malformed = result.error.issues.some(
        (issue) => issue.code === "invalid_type",
      );
      return c.json(
        { success: false, error },
        target === "json" && !malformed ? 422 : 400,
      );
    }
  });
