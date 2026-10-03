import { Hono } from "hono";
import { cors } from "hono/cors";
import { etag } from "hono/etag";
import { HTTPException } from "hono/http-exception";
import { trimTrailingSlash } from "hono/trailing-slash";

import { missions } from "./missions";
import { moons } from "./moons";
import { openApiDocument } from "./openapi";
import { planets } from "./planets";
import {
  missionsQuerySchema,
  planetsQuerySchema,
  travelEstimationSchema,
  validate,
} from "./schemas";
import { estimateTravel } from "./travel";
import {
  sortBy,
  toDetail,
  toMissionDetail,
  toMissionSummary,
  toMoonDetail,
  toMoonSummary,
  toSummary,
} from "./utils";

export const app = new Hono();
app.use(trimTrailingSlash());
app.use(cors());

app.notFound((c) => {
  return c.json({ success: false, error: "Route not found" }, 404);
});

app.onError((err, c) => {
  // Raised by Hono itself, e.g. for a malformed JSON body
  if (err instanceof HTTPException) {
    return c.json({ success: false, error: err.message }, err.status);
  }
  console.error(err);
  return c.json({ success: false, error: "Internal server error" }, 500);
});

app.get("/", (c) => {
  return c.json(
    {
      success: true,
      message: "Welcome to the Solar System API",
      endpoints: {
        health: "/health",
        openapi: "/openapi.json",
        planets: ["/planets", "/planets/{id}"],
        moons: ["/planets/{id}/moons", "/planets/{id}/moons/{moonId}"],
        missions: ["/missions", "/missions/{id}"],
        travelEstimation: "POST /travel-estimation",
      },
    },
    200,
  );
});

app.get("/health", (c) => {
  return c.json(
    {
      success: true,
      message: "Planets API is healthy",
      uptime: Math.floor(process.uptime()) + "s",
    },
    200,
  );
});

app.get("/openapi.json", (c) => {
  return c.json(openApiDocument, 200);
});

// The data is static: let clients and proxies cache it and revalidate with ETag
for (const path of ["/planets/*", "/missions/*"]) {
  app.use(path, etag());
  app.use(path, async (c, next) => {
    await next();
    if (c.res.ok) {
      c.header("Cache-Control", "public, max-age=3600");
    }
  });
}

app.get("/planets", validate("query", planetsQuerySchema), (c) => {
  const { type, hasRings, sort } = c.req.valid("query");
  let result = planets;

  if (type !== undefined) {
    result = result.filter((p) => p.type === type);
  }
  if (hasRings !== undefined) {
    result = result.filter((p) => p.hasRings === hasRings);
  }
  if (sort !== undefined) {
    result = sortBy(result, sort.field, sort.descending);
  }

  return c.json(
    {
      success: true,
      data: result.map(toSummary),
      message: "List of the Solar System planets with summary information",
    },
    200,
  );
});

app.get("/planets/:id", (c) => {
  const id = c.req.param("id").toLowerCase();
  const planet = planets.find((p) => p.id === id);
  if (!planet) {
    return c.json({ success: false, error: "Planet not found" }, 404);
  }
  return c.json(
    {
      success: true,
      data: toDetail(planet),
      message: `Detailed information about planet ${planet.name}`,
    },
    200,
  );
});

// Nested resource: a moon is only reachable through the planet it orbits
app.get("/planets/:id/moons", (c) => {
  const id = c.req.param("id").toLowerCase();
  const planet = planets.find((p) => p.id === id);
  if (!planet) {
    return c.json({ success: false, error: "Planet not found" }, 404);
  }
  return c.json(
    {
      success: true,
      data: moons.filter((m) => m.planetId === planet.id).map(toMoonSummary),
      message: `List of the main moons of planet ${planet.name}`,
    },
    200,
  );
});

app.get("/planets/:id/moons/:moonId", (c) => {
  const id = c.req.param("id").toLowerCase();
  const planet = planets.find((p) => p.id === id);
  if (!planet) {
    return c.json({ success: false, error: "Planet not found" }, 404);
  }
  const moonId = c.req.param("moonId").toLowerCase();
  const moon = moons.find((m) => m.planetId === planet.id && m.id === moonId);
  if (!moon) {
    return c.json({ success: false, error: "Moon not found" }, 404);
  }
  return c.json(
    {
      success: true,
      data: toMoonDetail(moon),
      message: `Detailed information about moon ${moon.name} of planet ${planet.name}`,
    },
    200,
  );
});

// Top-level collection: a mission can study several planets (many-to-many),
// so the relation is expressed with a filter instead of nesting
app.get("/missions", validate("query", missionsQuerySchema), (c) => {
  const { planet, agency, status, sort } = c.req.valid("query");
  let result = missions;

  if (planet !== undefined) {
    result = result.filter((m) => m.planets.includes(planet));
  }
  if (agency !== undefined) {
    result = result.filter((m) => m.agency === agency);
  }
  if (status !== undefined) {
    result = result.filter((m) => m.status === status);
  }
  if (sort !== undefined) {
    result = sortBy(result, sort.field, sort.descending);
  }

  return c.json(
    {
      success: true,
      data: result.map(toMissionSummary),
      message: "List of space missions with summary information",
    },
    200,
  );
});

app.get("/missions/:id", (c) => {
  const id = c.req.param("id").toLowerCase();
  const mission = missions.find((m) => m.id === id);
  if (!mission) {
    return c.json({ success: false, error: "Mission not found" }, 404);
  }
  return c.json(
    {
      success: true,
      data: toMissionDetail(mission),
      message: `Detailed information about mission ${mission.name}`,
    },
    200,
  );
});

// Business operation: POST runs a calculation from the request body.
// Nothing is created or stored, so it answers 200 (not 201) and is not cached
app.post(
  "/travel-estimation",
  validate("json", travelEstimationSchema),
  (c) => {
    const { from, to, speedKmPerSecond } = c.req.valid("json");
    // The schema guarantees that both ids are known planets
    const origin = planets.find((p) => p.id === from)!;
    const destination = planets.find((p) => p.id === to)!;

    // Each value is valid on its own, but the two conflict with each other
    if (origin === destination) {
      return c.json(
        {
          success: false,
          error: "Conflict between from and to: expected two different planets",
        },
        409,
      );
    }

    return c.json(
      {
        success: true,
        data: estimateTravel(origin, destination, speedKmPerSecond),
        message: `Estimated travel from ${origin.name} to ${destination.name}`,
      },
      200,
    );
  },
);
