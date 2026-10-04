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
  TOKEN_DELIVERIES,
} from "./types";

const planetIds = planets.map((p) => p.id);

const planetId = z
  .string()
  .toLowerCase()
  .refine((id) => planetIds.includes(id), {
    error: `expected one of: ${planetIds.join(", ")}`,
  });

// "field" trie par ordre croissant, "-field" par ordre décroissant
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
  participating: z
    .enum(["true", "false"])
    .transform((value) => value === "true")
    .optional(),
  sort: sort(MISSION_SORTABLE_FIELDS).optional(),
});

// Dans un corps JSON, une valeur absente ou qui n'est pas une chaîne est un
// problème de forme (400), une chaîne hors de la liste une valeur non
// traitable (422) : z.enum seul ne distingue pas les deux cas
const oneOf = <const T extends readonly [string, ...string[]]>(values: T) =>
  z.string().pipe(z.enum(values));

// Ni le statut ni la date de lancement ne sont acceptés à la création : une
// mission est toujours créée avec le statut planned, et n'est lancée que
// lorsqu'elle devient active. L'identifiant est généré par le serveur
export const missionCreationSchema = z.object({
  name: z.string().trim().min(1),
  agency: oneOf(AGENCIES),
  planets: z
    .array(planetId)
    .min(1)
    .refine((ids) => new Set(ids).size === ids.length, {
      error: "expected distinct planets",
    }),
  description: z.string().trim().min(1),
});

export const missionStatusSchema = z.object({
  status: oneOf(MISSION_STATUSES),
});

export const travelEstimationSchema = z.object({
  from: planetId,
  to: planetId,
  speedKmPerSecond: z.number().positive(),
});

export const loginSchema = z.object({
  email: z.string(),
  password: z.string(),
  delivery: z.enum(TOKEN_DELIVERIES).default("token"),
});

// Valide les données entrantes avec un schéma zod et répond dans l'enveloppe
// de l'API quand elles ne correspondent pas :
// - 400 quand la requête est mal formée : paramètre de requête invalide, ou
//   corps avec un champ manquant ou du mauvais type
// - 422 quand le corps est bien formé mais qu'une valeur ne peut pas être
//   traitée
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
