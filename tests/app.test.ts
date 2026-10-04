import { describe, expect, test } from "bun:test";
import { decode } from "hono/jwt";

import { app } from "../src/app";
import { createToken } from "../src/auth";

const user = {
  id: "5f0f4aca-7368-4b38-b2fe-a2ed7925441b",
  email: "john@doe.com",
  role: "astronaut",
} as const;

process.env.JWT_SECRET = "test-secret";
process.env.CORS_ORIGIN = "http://localhost:5173";

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
      "/auth/login",
      "/auth/logout",
      "/auth/me",
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

const authRequest = async (path: string) =>
  app.request(path, {
    headers: { Authorization: `Bearer ${await createToken(user)}` },
  });

describe("GET /missions", () => {
  test("requires a token on every missions route", async () => {
    for (const path of ["/missions", "/missions/juno", "/missions/apollo-11"]) {
      const res = await app.request(path);
      expect(res.status).toBe(401);
      expect(res.headers.get("WWW-Authenticate")).toBe("Bearer");
      expect(res.headers.get("Cache-Control")).toBeNull();
    }
  });

  test("accepts the token as a cookie", async () => {
    const res = await app.request("/missions", {
      headers: { Cookie: `access_token=${await createToken(user)}` },
    });
    expect(res.status).toBe(200);
  });

  test("allows credentials only for the configured origin", async () => {
    const res = await app.request("/missions", {
      headers: { Origin: "http://localhost:5173" },
    });
    expect(res.headers.get("Access-Control-Allow-Credentials")).toBe("true");
    const other = await app.request("/missions", {
      headers: { Origin: "https://example.com" },
    });
    expect(other.headers.get("Access-Control-Allow-Origin")).toBeNull();
  });

  test("returns the missions as summaries with a self link", async () => {
    const res = await authRequest("/missions");
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
    const res = await authRequest("/missions?planet=saturn");
    expect(ids(await res.json())).toEqual([
      "pioneer-11",
      "voyager-2",
      "voyager-1",
      "cassini-huygens",
    ]);
  });

  test("a mission appears under each planet it studied", async () => {
    for (const planet of ["jupiter", "saturn", "uranus", "neptune"]) {
      const res = await authRequest(`/missions?planet=${planet}`);
      expect(ids(await res.json())).toContain("voyager-2");
    }
  });

  test("returns an empty list for a planet without missions", async () => {
    const res = await authRequest("/missions?planet=earth");
    expect(res.status).toBe(200);
    expect((await res.json()).data).toEqual([]);
  });

  test("combines filters and sort", async () => {
    const res = await authRequest(
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
    const res = await authRequest("/missions?agency=ESA");
    expect(ids(await res.json())).toEqual([
      "mars-express",
      "venus-express",
      "bepicolombo",
    ]);
  });

  test.each(["planet=pluto", "agency=SpaceX", "status=lost", "sort=agency"])(
    "rejects ?%s with a 400",
    async (query) => {
      const res = await authRequest(`/missions?${query}`);
      expect(res.status).toBe(400);
      expect((await res.json()).success).toBe(false);
    },
  );

  test("the missions link of every planet resolves", async () => {
    for (const planet of (await (await authRequest("/planets")).json()).data) {
      const detail = await (await authRequest(planet.links.self)).json();
      expect((await authRequest(detail.data.links.missions)).status).toBe(200);
    }
  });
});

describe("GET /missions/:id", () => {
  test("returns the mission details with its planets and their links", async () => {
    const res = await authRequest("/missions/voyager-2");
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
    const res = await authRequest("/missions/mariner-10");
    const planets = (await res.json()).data.planets;
    expect(planets.map((p: { id: string }) => p.id)).toEqual([
      "venus",
      "mercury",
    ]);
  });

  test("every mission resolves and only references known planets", async () => {
    const list = await (await authRequest("/missions")).json();
    for (const summary of list.data) {
      const res = await authRequest(summary.links.self);
      expect(res.status).toBe(200);
      const mission = (await res.json()).data;
      expect(mission.planets.length).toBeGreaterThan(0);
      for (const planet of mission.planets) {
        expect((await authRequest(planet.links.self)).status).toBe(200);
      }
    }
  });

  test("matches the id case-insensitively", async () => {
    const res = await authRequest("/missions/Voyager-2");
    expect(res.status).toBe(200);
  });

  test("returns a JSON 404 for an unknown mission", async () => {
    const res = await authRequest("/missions/apollo-11");
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({
      success: false,
      error: "Mission not found",
    });
  });

  test("is kept out of shared caches and revalidated", async () => {
    const res = await authRequest("/missions/juno");
    expect(res.headers.get("Cache-Control")).toBe("private, no-cache");
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

const credentials = { email: "john@doe.com", password: "azerty" };

const login = (body: unknown) =>
  app.request("/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

describe("POST /auth/login", () => {
  test("returns a JWT in the body by default, without cookie", async () => {
    for (const body of [credentials, { ...credentials, delivery: "token" }]) {
      const res = await login(body);
      expect(res.status).toBe(200);
      const { data } = await res.json();
      expect(data.tokenType).toBe("Bearer");
      expect(data.expiresIn).toBe(3600);
      expect(data.accessToken.split(".")).toHaveLength(3);
      const payload = decode(data.accessToken).payload;
      expect(payload.sub).toBe(user.id);
      expect(payload.role).toBe("astronaut");
      // No directly identifying data in a payload that anyone can read
      expect(payload.email).toBeUndefined();
      expect(Object.keys(payload).sort()).toEqual(["exp", "iat", "role", "sub"]);
      expect(payload.exp! - payload.iat!).toBe(3600);
      expect(res.headers.get("Set-Cookie")).toBeNull();
      expect(res.headers.get("Cache-Control")).toBe("no-store");
    }
  });

  test("with delivery cookie, sets the JWT in an httpOnly cookie and keeps it out of the body", async () => {
    const res = await login({ ...credentials, delivery: "cookie" });
    expect(res.status).toBe(200);
    const cookie = res.headers.get("Set-Cookie")!;
    expect(cookie).toStartWith("access_token=");
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("SameSite=Lax");
    expect(cookie).toContain("Max-Age=3600");
    const body = await res.json();
    expect(body.data).toEqual({ ...user, expiresIn: 3600 });
  });

  test("rejects a wrong password or an unknown email with a 401, without cookie", async () => {
    for (const body of [
      { ...credentials, password: "qwerty" },
      { ...credentials, email: "jane@doe.com" },
      { ...credentials, password: "qwerty", delivery: "cookie" },
    ]) {
      const res = await login(body);
      expect(res.status).toBe(401);
      expect(res.headers.get("Set-Cookie")).toBeNull();
      expect(await res.json()).toEqual({
        success: false,
        error: "Invalid credentials",
      });
    }
  });

  test("rejects a malformed body with a 400", async () => {
    const res = await login({ email: "john@doe.com" });
    expect(res.status).toBe(400);
  });

  test("rejects an unknown delivery with a 422", async () => {
    const res = await login({ ...credentials, delivery: "header" });
    expect(res.status).toBe(422);
    expect((await res.json()).error).toContain("Invalid delivery");
  });
});

describe("POST /auth/logout", () => {
  test("deletes the cookie", async () => {
    const res = await app.request("/auth/logout", { method: "POST" });
    expect(res.status).toBe(200);
    const cookie = res.headers.get("Set-Cookie")!;
    expect(cookie).toStartWith("access_token=;");
    expect(cookie).toContain("Max-Age=0");
  });
});

describe("GET /auth/me", () => {
  test("accepts the token as a Bearer header", async () => {
    const { accessToken } = (await (await login(credentials)).json()).data;
    const res = await app.request("/auth/me", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    expect(res.status).toBe(200);
    expect((await res.json()).data).toEqual(user);
  });

  test("accepts the token as a cookie", async () => {
    const loggedIn = await login({ ...credentials, delivery: "cookie" });
    const cookie = loggedIn.headers.get("Set-Cookie")!.split(";")[0]!;
    const res = await app.request("/auth/me", { headers: { Cookie: cookie } });
    expect(res.status).toBe(200);
    expect((await res.json()).data).toEqual(user);
  });

  test("answers 404 when the user of the token no longer exists", async () => {
    const token = await createToken({ id: crypto.randomUUID(), role: "astronaut" });
    const res = await app.request("/auth/me", {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(404);
  });

  test("rejects a missing or tampered token with a 401", async () => {
    const missing = await app.request("/auth/me");
    expect(missing.status).toBe(401);
    expect(missing.headers.get("WWW-Authenticate")).toBe("Bearer");

    const { accessToken } = (await (await login(credentials)).json()).data;
    const tampered = await app.request("/auth/me", {
      headers: { Authorization: `Bearer ${accessToken}x` },
    });
    expect(tampered.status).toBe(401);
  });

  test("allows credentials only for the configured origin", async () => {
    const allowed = await app.request("/auth/me", {
      headers: { Origin: "http://localhost:5173" },
    });
    expect(allowed.headers.get("Access-Control-Allow-Origin")).toBe(
      "http://localhost:5173",
    );
    expect(allowed.headers.get("Access-Control-Allow-Credentials")).toBe(
      "true",
    );

    const other = await app.request("/auth/me", {
      headers: { Origin: "https://example.com" },
    });
    expect(other.headers.get("Access-Control-Allow-Origin")).toBeNull();
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
