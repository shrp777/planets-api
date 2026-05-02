import { Hono } from "hono";
import { planets } from "./planets";
import { toSummary } from "./utils";

export const app = new Hono();

app.get("/planets", (c) => {
  return c.json(
    {
      data: planets.map(toSummary),
      message: "List of the Solar System 8 planets with summary information",
    },
    200,
  );
});

app.get("/planets/:id", (c) => {
  const planet = planets.find((p) => p.id === c.req.param("id"));
  if (!planet) {
    return c.json({ error: "Planet not found" }, 404);
  }
  return c.json(
    {
      data: planet,
      message: `Detailed information about planet ${planet.name}`,
    },
    200,
  );
});
