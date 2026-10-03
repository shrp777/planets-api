import { Hono } from "hono";
import { trimTrailingSlash } from "hono/trailing-slash";

import { planets } from "./planets";
import { toSummary } from "./utils";

export const app = new Hono();
app.use(trimTrailingSlash());

app.get("/", (c) => {
  return c.json(
    {
      success: true,
      message: "Welcome to the Solar System API",
      endpoints: {
        health: "/health",
        planets: ["/planets", "/planets/{id}"],
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

app.get("/planets", (c) => {
  return c.json(
    {
      success: true,
      data: planets.map(toSummary),
      message: "List of the Solar System 8 planets with summary information",
    },
    200,
  );
});

app.get("/planets/:id", (c) => {
  const planet = planets.find((p) => p.id === c.req.param("id"));
  if (!planet) {
    return c.json({ success: false, error: "Planet not found" }, 404);
  }
  return c.json(
    {
      success: true,
      data: planet,
      message: `Detailed information about planet ${planet.name}`,
    },
    200,
  );
});
