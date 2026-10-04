import { Hono } from "hono";
import { cors } from "hono/cors";
import { etag } from "hono/etag";
import { HTTPException } from "hono/http-exception";
import { trimTrailingSlash } from "hono/trailing-slash";

import {
  type AuthEnv,
  authenticate,
  checkCredentials,
  clearAuthCookie,
  createToken,
  findUserById,
  setAuthCookie,
  TOKEN_TTL_SECONDS,
} from "./auth";
import { missions } from "./missions";
import { moons } from "./moons";
import { openApiDocument } from "./openapi";
import { participations } from "./participations";
import { planets } from "./planets";
import {
  loginSchema,
  missionCreationSchema,
  missionsQuerySchema,
  missionStatusSchema,
  planetsQuerySchema,
  travelEstimationSchema,
  validate,
} from "./schemas";
import { estimateTravel } from "./travel";
import { MISSION_STATUSES, type Mission } from "./types";
import {
  sortBy,
  toDetail,
  toMissionDetail,
  toMissionSummary,
  toMoonDetail,
  toMoonSummary,
  toSummary,
} from "./utils";

export const app = new Hono<AuthEnv>();
app.use(trimTrailingSlash());

// Les données publiques sont ouvertes à toutes les origines. Les routes d'auth
// et les routes privées transportent un cookie, que les navigateurs n'acceptent
// que d'une origine explicitement autorisée (jamais de "*")
const publicCors = cors();
const credentialedCors = cors({
  origin: (origin) => {
    const allowed = (Bun.env.CORS_ORIGIN ?? "").split(",").map((o) => o.trim());
    return allowed.includes(origin) ? origin : null;
  },
  credentials: true,
});
app.use((c, next) => {
  const acceptsCookie = /^\/(auth|missions)(\/|$)/.test(c.req.path);
  return acceptsCookie ? credentialedCors(c, next) : publicCors(c, next);
});

app.notFound((c) => {
  return c.json({ success: false, error: "Route not found" }, 404);
});

app.onError((err, c) => {
  // Levée par Hono lui-même, par exemple pour un corps JSON mal formé
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
        missions: [
          "/missions",
          "POST /missions",
          "/missions/{id}",
          "PATCH /missions/{id}",
          "DELETE /missions/{id}",
        ],
        travelEstimation: "POST /travel-estimation",
        auth: [
          "POST /auth/login",
          "POST /auth/logout",
          "/auth/me",
        ],
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

// Les données sont statiques : les clients et les proxys peuvent les mettre en
// cache et les revalider avec l'ETag
app.use("/planets/*", etag());
app.use("/planets/*", async (c, next) => {
  await next();
  if (c.res.ok) {
    c.header("Cache-Control", "public, max-age=3600");
  }
});

// Routes privées : un token valide est exigé. La réponse à une lecture ne doit
// pas être stockée par un cache partagé, et le navigateur doit la revalider à
// chaque fois (no-cache) pour que le token soit de nouveau vérifié. Les
// écritures (POST, PATCH) ne sont pas concernées par le cache
app.use("/missions/*", authenticate);
app.get("/missions/*", etag());
app.get("/missions/*", async (c, next) => {
  await next();
  if (c.res.ok) {
    c.header("Cache-Control", "private, no-cache");
  }
});

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

// Ressource imbriquée : une lune n'est accessible que par la planète autour de
// laquelle elle orbite
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

// Collection de premier niveau : une mission peut étudier plusieurs planètes
// (plusieurs-à-plusieurs), la relation s'exprime donc par un filtre plutôt que
// par une imbrication
app.get("/missions", validate("query", missionsQuerySchema), (c) => {
  const { planet, agency, status, participating, sort } = c.req.valid("query");
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
  if (participating !== undefined) {
    // L'id vient du token, jamais d'un paramètre fourni par le client : un
    // utilisateur ne peut pas consulter les participations d'un autre
    const userId = c.get("user").id;
    const missionIds = participations
      .filter((p) => p.userId === userId)
      .map((p) => p.missionId);
    result = result.filter((m) => missionIds.includes(m.id) === participating);
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

// Création : POST sur la collection. La persistance est simulée : la mission
// est ajoutée à la liste en mémoire, elle est donc visible par les autres
// routes mais perdue au redémarrage du serveur
app.post("/missions", validate("json", missionCreationSchema), (c) => {
  const { name, agency, planets, description } = c.req.valid("json");

  // L'identifiant est généré par le serveur : un UUID, unique sans avoir à
  // consulter les missions existantes. Le statut n'est pas non plus choisi par
  // le client : toute mission commence planifiée, donc sans date de lancement
  const mission: Mission = {
    id: crypto.randomUUID(),
    name,
    agency,
    launchDate: null,
    status: "planned",
    planets,
    description,
  };
  missions.push(mission);

  // 201 et en-tête Location : une ressource a été créée, voici son URL
  const data = toMissionDetail(mission);
  c.header("Location", data.links.self);
  return c.json(
    {
      success: true,
      data,
      message: `Mission ${mission.name} created`,
    },
    201,
  );
});

// Mise à jour partielle : le client n'envoie que le statut. Le cycle de vie
// est à sens unique : planned, puis active, puis completed
app.patch("/missions/:id", validate("json", missionStatusSchema), (c) => {
  const id = c.req.param("id").toLowerCase();
  const mission = missions.find((m) => m.id === id);
  if (!mission) {
    return c.json({ success: false, error: "Mission not found" }, 404);
  }

  const { status } = c.req.valid("json");
  const next = MISSION_STATUSES[MISSION_STATUSES.indexOf(mission.status) + 1];

  // Le statut demandé est valide, mais en conflit avec l'état de la mission
  if (status !== next) {
    const expected = next
      ? `can only become ${next}`
      : "cannot change status anymore";
    return c.json(
      {
        success: false,
        error: `Conflict on status: a ${mission.status} mission ${expected}`,
      },
      409,
    );
  }

  mission.status = status;
  // Passer à active, c'est lancer la mission : la date de lancement est celle
  // du jour (UTC), fixée par le serveur et non par le client
  if (status === "active") {
    mission.launchDate = new Date().toISOString().slice(0, 10);
  }
  return c.json(
    {
      success: true,
      data: toMissionDetail(mission),
      message: `Mission ${mission.name} is now ${mission.status}`,
    },
    200,
  );
});

// Suppression : la mission est retirée de la liste en mémoire. Il n'y a plus
// rien à renvoyer : la réponse est un 204, sans corps
app.delete("/missions/:id", (c) => {
  const id = c.req.param("id").toLowerCase();
  const index = missions.findIndex((m) => m.id === id);
  const mission = missions[index];
  if (!mission) {
    return c.json({ success: false, error: "Mission not found" }, 404);
  }

  // Une mission lancée fait partie de l'historique : seule une mission encore
  // planifiée peut être supprimée. La requête est valide, mais en conflit avec
  // l'état de la mission
  if (mission.status !== "planned") {
    return c.json(
      {
        success: false,
        error: "Conflict on status: only a planned mission can be deleted",
      },
      409,
    );
  }

  missions.splice(index, 1);
  return c.body(null, 204);
});

// Opération métier : POST lance un calcul à partir du corps de la requête.
// Rien n'est créé ni stocké, la réponse est donc un 200 (et non un 201) et
// n'est pas mise en cache
app.post(
  "/travel-estimation",
  validate("json", travelEstimationSchema),
  (c) => {
    const { from, to, speedKmPerSecond } = c.req.valid("json");
    // Le schéma garantit que les deux identifiants sont des planètes connues
    const origin = planets.find((p) => p.id === from)!;
    const destination = planets.find((p) => p.id === to)!;

    // Chaque valeur est valide isolément, mais les deux sont en conflit
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

// Un token ne doit jamais être stocké par un cache
app.use("/auth/*", async (c, next) => {
  await next();
  c.header("Cache-Control", "no-store");
});

// Un seul endpoint, le champ delivery choisit le transport du token :
// - "token" (par défaut), pour les clients d'API : le token est renvoyé dans le
//   corps, puis transmis dans l'en-tête Authorization
// - "cookie", pour un front end dans un navigateur : le token est uniquement
//   déposé dans un cookie httpOnly, il est absent du corps pour que JavaScript
//   ne puisse jamais le lire
app.post("/auth/login", validate("json", loginSchema), async (c) => {
  const { email, password, delivery } = c.req.valid("json");
  const user = await checkCredentials(email, password);
  if (!user) {
    return c.json({ success: false, error: "Invalid credentials" }, 401);
  }
  const token = await createToken(user);

  if (delivery === "cookie") {
    setAuthCookie(c, token);
    return c.json(
      {
        success: true,
        data: { ...user, expiresIn: TOKEN_TTL_SECONDS },
        message: "Authentication successful",
      },
      200,
    );
  }

  return c.json(
    {
      success: true,
      data: {
        accessToken: token,
        tokenType: "Bearer",
        expiresIn: TOKEN_TTL_SECONDS,
      },
      message: "Authentication successful",
    },
    200,
  );
});

// JavaScript ne peut pas supprimer un cookie httpOnly : c'est au serveur de le
// faire
app.post("/auth/logout", (c) => {
  clearAuthCookie(c);
  return c.json({ success: true, message: "Logged out" }, 200);
});

app.get("/auth/me", authenticate, (c) => {
  // L'email n'est pas dans le token : il est relu à partir de l'id
  const user = findUserById(c.get("user").id);
  if (!user) {
    return c.json({ success: false, error: "User not found" }, 404);
  }
  return c.json(
    {
      success: true,
      data: user,
      message: "Authenticated user",
    },
    200,
  );
});
