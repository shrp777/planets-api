import { describe, expect, test } from "bun:test";

import { app } from "./app";

const ids = (body: { data: { id: string }[] }) => body.data.map((p) => p.id);

describe("GET /", () => {
  test("lists the endpoints", async () => {
    const res = await app.request("/");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.endpoints.planets).toContain("/planets");
  });
});

describe("GET /health", () => {
  test("reports a healthy API without caching", async () => {
    const res = await app.request("/health");
    expect(res.status).toBe(200);
    expect((await res.json()).success).toBe(true);
    expect(res.headers.get("Cache-Control")).toBeNull();
  });
});

describe("GET /openapi.json", () => {
  test("describes the routes", async () => {
    const res = await app.request("/openapi.json");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Object.keys(body.paths)).toEqual([
      "/health",
      "/planets",
      "/planets/{id}",
      "/planets/{id}/moons",
      "/planets/{id}/moons/{moonId}",
      "/missions",
      "/missions/{id}",
      "/travel-estimation",
    ]);
  });
});

describe("GET /planets", () => {
  test("returns the 8 planets as summaries with a self link", async () => {
    const res = await app.request("/planets");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data).toHaveLength(8);
    expect(body.data[0]).toEqual({
      id: "mercury",
      name: "Mercury",
      order: 1,
      type: "terrestrial",
      links: { self: "/planets/mercury" },
    });
  });

  test("filters by type", async () => {
    const res = await app.request("/planets?type=gas%20giant");
    expect(ids(await res.json())).toEqual(["jupiter", "saturn"]);
  });

  test("filters by hasRings", async () => {
    const res = await app.request("/planets?hasRings=false");
    expect(ids(await res.json())).toEqual(["mercury", "venus", "earth", "mars"]);
  });

  test("sorts ascending and descending", async () => {
    const asc = await app.request("/planets?sort=diameterKm");
    expect(ids(await asc.json())[0]).toBe("mercury");
    const desc = await app.request("/planets?sort=-massKg");
    expect(ids(await desc.json()).slice(0, 2)).toEqual(["jupiter", "saturn"]);
  });

  test("combines filter and sort", async () => {
    const res = await app.request("/planets?hasRings=true&sort=name");
    expect(ids(await res.json())).toEqual([
      "jupiter",
      "neptune",
      "saturn",
      "uranus",
    ]);
  });

  test.each(["type=dwarf", "hasRings=maybe", "sort=description"])(
    "rejects ?%s with a 400",
    async (query) => {
      const res = await app.request(`/planets?${query}`);
      expect(res.status).toBe(400);
      expect((await res.json()).success).toBe(false);
    },
  );

  test("redirects a trailing slash", async () => {
    const res = await app.request("/planets/");
    expect(res.status).toBe(301);
    expect(new URL(res.headers.get("Location")!).pathname).toBe("/planets");
  });
});

describe("GET /planets/:id", () => {
  test("returns the planet details with a numeric mass", async () => {
    const res = await app.request("/planets/earth");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.name).toBe("Earth");
    expect(body.data.massKg).toBe(5.97e24);
    expect(body.data.links).toEqual({
      self: "/planets/earth",
      moons: "/planets/earth/moons",
      missions: "/missions?planet=earth",
    });
  });

  test("matches the id case-insensitively", async () => {
    const res = await app.request("/planets/Earth");
    expect(res.status).toBe(200);
  });

  test("returns a JSON 404 for an unknown planet", async () => {
    const res = await app.request("/planets/pluto");
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({
      success: false,
      error: "Planet not found",
    });
    expect(res.headers.get("Cache-Control")).toBeNull();
  });
});

describe("GET /planets/:id/moons", () => {
  test("returns the moons of the planet as summaries with links", async () => {
    const res = await app.request("/planets/mars/moons");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data).toEqual([
      {
        id: "phobos",
        name: "Phobos",
        links: { self: "/planets/mars/moons/phobos", planet: "/planets/mars" },
      },
      {
        id: "deimos",
        name: "Deimos",
        links: { self: "/planets/mars/moons/deimos", planet: "/planets/mars" },
      },
    ]);
  });

  test("returns an empty list, not a 404, for a planet without moons", async () => {
    const res = await app.request("/planets/mercury/moons");
    expect(res.status).toBe(200);
    expect((await res.json()).data).toEqual([]);
  });

  test("returns a 404 for an unknown planet", async () => {
    const res = await app.request("/planets/pluto/moons");
    expect(res.status).toBe(404);
    expect((await res.json()).error).toBe("Planet not found");
  });

  test("every moon link resolves", async () => {
    for (const planet of ["earth", "mars", "jupiter", "saturn", "uranus", "neptune"]) {
      const list = await (await app.request(`/planets/${planet}/moons`)).json();
      expect(list.data.length).toBeGreaterThan(0);
      for (const moon of list.data) {
        expect((await app.request(moon.links.self)).status).toBe(200);
        expect((await app.request(moon.links.planet)).status).toBe(200);
      }
    }
  });
});

describe("GET /planets/:id/moons/:moonId", () => {
  test("returns the moon details", async () => {
    const res = await app.request("/planets/jupiter/moons/europa");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.name).toBe("Europa");
    expect(body.data.planetId).toBe("jupiter");
    expect(body.data.links).toEqual({
      self: "/planets/jupiter/moons/europa",
      planet: "/planets/jupiter",
    });
  });

  test("matches both ids case-insensitively", async () => {
    const res = await app.request("/planets/Jupiter/moons/Europa");
    expect(res.status).toBe(200);
  });

  test("returns a 404 for an unknown planet", async () => {
    const res = await app.request("/planets/pluto/moons/charon");
    expect(res.status).toBe(404);
    expect((await res.json()).error).toBe("Planet not found");
  });

  test("returns a 404 for an unknown moon", async () => {
    const res = await app.request("/planets/mars/moons/nope");
    expect(res.status).toBe(404);
    expect((await res.json()).error).toBe("Moon not found");
  });

  test("returns a 404 for a moon that belongs to another planet", async () => {
    const res = await app.request("/planets/mars/moons/europa");
    expect(res.status).toBe(404);
    expect((await res.json()).error).toBe("Moon not found");
  });

  test("is cached like the other planet routes", async () => {
    const res = await app.request("/planets/earth/moons/moon");
    expect(res.headers.get("Cache-Control")).toBe("public, max-age=3600");
    expect(res.headers.get("ETag")).toBeTruthy();
  });
});

describe("GET /missions", () => {
  test("returns the missions as summaries with a self link", async () => {
    const res = await app.request("/missions");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data).toHaveLength(18);
    expect(body.data[0]).toEqual({
      id: "pioneer-11",
      name: "Pioneer 11",
      agency: "NASA",
      launchDate: "1973-04-06",
      status: "completed",
      links: { self: "/missions/pioneer-11" },
    });
  });

  test("filters by planet", async () => {
    const res = await app.request("/missions?planet=saturn");
    expect(ids(await res.json())).toEqual([
      "pioneer-11",
      "voyager-2",
      "voyager-1",
      "cassini-huygens",
    ]);
  });

  test("a mission appears under each planet it studied", async () => {
    for (const planet of ["jupiter", "saturn", "uranus", "neptune"]) {
      const res = await app.request(`/missions?planet=${planet}`);
      expect(ids(await res.json())).toContain("voyager-2");
    }
  });

  test("returns an empty list for a planet without missions", async () => {
    const res = await app.request("/missions?planet=earth");
    expect(res.status).toBe(200);
    expect((await res.json()).data).toEqual([]);
  });

  test("combines filters and sort", async () => {
    const res = await app.request(
      "/missions?planet=mars&status=active&sort=-launchDate",
    );
    expect(ids(await res.json())).toEqual([
      "perseverance",
      "tianwen-1",
      "curiosity",
      "mars-express",
    ]);
  });

  test("filters by agency", async () => {
    const res = await app.request("/missions?agency=ESA");
    expect(ids(await res.json())).toEqual([
      "mars-express",
      "venus-express",
      "bepicolombo",
    ]);
  });

  test.each(["planet=pluto", "agency=SpaceX", "status=lost", "sort=agency"])(
    "rejects ?%s with a 400",
    async (query) => {
      const res = await app.request(`/missions?${query}`);
      expect(res.status).toBe(400);
      expect((await res.json()).success).toBe(false);
    },
  );

  test("the missions link of every planet resolves", async () => {
    for (const planet of (await (await app.request("/planets")).json()).data) {
      const detail = await (await app.request(planet.links.self)).json();
      expect((await app.request(detail.data.links.missions)).status).toBe(200);
    }
  });
});

describe("GET /missions/:id", () => {
  test("returns the mission details with its planets and their links", async () => {
    const res = await app.request("/missions/voyager-2");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.name).toBe("Voyager 2");
    expect(body.data.launchDate).toBe("1977-08-20");
    expect(body.data.planets).toEqual([
      { id: "jupiter", name: "Jupiter", links: { self: "/planets/jupiter" } },
      { id: "saturn", name: "Saturn", links: { self: "/planets/saturn" } },
      { id: "uranus", name: "Uranus", links: { self: "/planets/uranus" } },
      { id: "neptune", name: "Neptune", links: { self: "/planets/neptune" } },
    ]);
    expect(body.data.links).toEqual({ self: "/missions/voyager-2" });
  });

  test("lists the planets in the order they were visited", async () => {
    const res = await app.request("/missions/mariner-10");
    const planets = (await res.json()).data.planets;
    expect(planets.map((p: { id: string }) => p.id)).toEqual([
      "venus",
      "mercury",
    ]);
  });

  test("every mission resolves and only references known planets", async () => {
    const list = await (await app.request("/missions")).json();
    for (const summary of list.data) {
      const res = await app.request(summary.links.self);
      expect(res.status).toBe(200);
      const mission = (await res.json()).data;
      expect(mission.planets.length).toBeGreaterThan(0);
      for (const planet of mission.planets) {
        expect((await app.request(planet.links.self)).status).toBe(200);
      }
    }
  });

  test("matches the id case-insensitively", async () => {
    const res = await app.request("/missions/Voyager-2");
    expect(res.status).toBe(200);
  });

  test("returns a JSON 404 for an unknown mission", async () => {
    const res = await app.request("/missions/apollo-11");
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({
      success: false,
      error: "Mission not found",
    });
  });

  test("is cached like the planet routes", async () => {
    const res = await app.request("/missions/juno");
    expect(res.headers.get("Cache-Control")).toBe("public, max-age=3600");
    expect(res.headers.get("ETag")).toBeTruthy();
  });
});

const postEstimate = (body: unknown) =>
  app.request("/travel-estimation", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });

describe("POST /travel-estimation", () => {
  test("computes the distance and duration between two planets", async () => {
    const res = await postEstimate({
      from: "earth",
      to: "mars",
      speedKmPerSecond: 17,
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data).toEqual({
      from: { id: "earth", name: "Earth", links: { self: "/planets/earth" } },
      to: { id: "mars", name: "Mars", links: { self: "/planets/mars" } },
      speedKmPerSecond: 17,
      distanceAU: 0.52,
      distanceKm: 77790893,
      durationSeconds: 4575935,
      durationDays: 53,
    });
  });

  test("gives the same distance in both directions", async () => {
    const there = await postEstimate({ from: "earth", to: "neptune", speedKmPerSecond: 10 });
    const back = await postEstimate({ from: "neptune", to: "earth", speedKmPerSecond: 10 });
    expect((await there.json()).data.distanceKm).toBe(
      (await back.json()).data.distanceKm,
    );
  });

  test("halves the duration when the speed doubles", async () => {
    const slow = await postEstimate({ from: "earth", to: "jupiter", speedKmPerSecond: 10 });
    const fast = await postEstimate({ from: "earth", to: "jupiter", speedKmPerSecond: 20 });
    const slowSeconds = (await slow.json()).data.durationSeconds;
    const fastSeconds = (await fast.json()).data.durationSeconds;
    expect(Math.abs(slowSeconds - 2 * fastSeconds)).toBeLessThanOrEqual(1);
  });

  test("matches planet ids case-insensitively", async () => {
    const res = await postEstimate({ from: "Earth", to: "MARS", speedKmPerSecond: 17 });
    expect(res.status).toBe(200);
  });

  test("is neither cached nor created", async () => {
    const res = await postEstimate({ from: "earth", to: "mars", speedKmPerSecond: 17 });
    expect(res.headers.get("Cache-Control")).toBeNull();
    expect(res.headers.get("Location")).toBeNull();
  });

  test.each([
    ["malformed JSON", "{not json"],
    ["a non-object body", [1, 2]],
    ["a missing field", { from: "earth", speedKmPerSecond: 17 }],
    ["a speed sent as a string", { from: "earth", to: "mars", speedKmPerSecond: "17" }],
    ["a planet sent as a number", { from: 3, to: "mars", speedKmPerSecond: 17 }],
  ])("rejects %s with a 400 (malformed request)", async (_label, body) => {
    const res = await postEstimate(body);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(typeof json.error).toBe("string");
  });

  test.each([
    ["an unknown planet", { from: "earth", to: "pluto", speedKmPerSecond: 17 }],
    ["a zero speed", { from: "earth", to: "mars", speedKmPerSecond: 0 }],
    ["a negative speed", { from: "earth", to: "mars", speedKmPerSecond: -5 }],
  ])("rejects %s with a 422 (unprocessable value)", async (_label, body) => {
    const res = await postEstimate(body);
    expect(res.status).toBe(422);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(typeof json.error).toBe("string");
  });

  test("rejects the same planet twice with a 409 (conflict)", async () => {
    const res = await postEstimate({ from: "earth", to: "Earth", speedKmPerSecond: 17 });
    expect(res.status).toBe(409);
    expect((await res.json()).success).toBe(false);
  });

  test("answers 400 when a body is both malformed and unprocessable", async () => {
    const res = await postEstimate({ from: "pluto", to: "mars", speedKmPerSecond: "17" });
    expect(res.status).toBe(400);
  });

  test("reports every invalid field in a single error", async () => {
    const res = await postEstimate({ from: "pluto", to: "mars", speedKmPerSecond: -1 });
    const { error } = await res.json();
    expect(error).toContain("Invalid from");
    expect(error).toContain("Invalid speedKmPerSecond");
  });

  test("rejects a body sent without a JSON Content-Type", async () => {
    const res = await app.request("/travel-estimation", {
      method: "POST",
      body: JSON.stringify({ from: "earth", to: "mars", speedKmPerSecond: 17 }),
    });
    expect(res.status).toBe(400);
    expect((await res.json()).success).toBe(false);
  });

  test("answers the CORS preflight", async () => {
    const res = await app.request("/travel-estimation", {
      method: "OPTIONS",
      headers: {
        Origin: "https://example.com",
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "Content-Type",
      },
    });
    expect(res.status).toBe(204);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
  });
});

describe("HTTP caching and CORS", () => {
  test("sets Cache-Control and ETag, and answers 304 on revalidation", async () => {
    const first = await app.request("/planets");
    expect(first.headers.get("Cache-Control")).toBe("public, max-age=3600");
    const tag = first.headers.get("ETag");
    expect(tag).toBeTruthy();

    const second = await app.request("/planets", {
      headers: { "If-None-Match": tag! },
    });
    expect(second.status).toBe(304);
  });

  test("allows cross-origin requests", async () => {
    const res = await app.request("/planets", {
      headers: { Origin: "https://example.com" },
    });
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
  });
});

describe("unknown routes", () => {
  test("return a JSON 404", async () => {
    const res = await app.request("/foo");
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({
      success: false,
      error: "Route not found",
    });
  });
});
