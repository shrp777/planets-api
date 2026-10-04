# Planets API

API REST exposant les 8 planètes du système solaire.

## Documentation

Le dossier [docs/](docs/README.md) explique les choix de conception de l'API :

- [Architecture](docs/architecture.md) : pile technique, organisation du code, parcours d'une requête, conventions REST
- [Ressources](docs/ressources.md) : ressources exposées et relations entre elles
- [Authentification](docs/authentification.md) : token JWT, routes privées, filtrage selon l'utilisateur

## Variables d'environnement

- Créer un fichier `.env` à partir du fichier `.env.example`

- **PORT** = port employé dans le conteneur Docker
- **EXTERNAL_PORT** = port employé sur la machine hôte
- **JWT_SECRET** = clé de signature des tokens JWT, obligatoire (ex : `openssl rand -base64 32`)
- **CORS_ORIGIN** = origines autorisées à appeler `/auth/*` et `/missions` avec le cookie, séparées par des virgules (ex : `http://localhost:5173`)

## Lancement de l'API

```sh
docker compose up --build
```

L'API est alors disponible sur `http://localhost:{EXTERNAL_PORT}`.

## Développement

```sh
bun install
bun run dev        # serveur avec rechargement à chaud
bun test           # tests
bun run typecheck  # vérification des types
```

## Collection Bruno

Le dossier `bruno/` contient une collection [Bruno](https://www.usebruno.com) couvrant tous les endpoints, cas d'erreur compris (`400`, `401`, `404`, `409`, `422`).

- Dans Bruno : _Open Collection_, puis sélectionner le dossier `bruno/`.
- Choisir l'environnement `Local` (`http://localhost:3000`, pour `bun run dev`) ou `Docker` (`http://localhost:8079`, la valeur d'`EXTERNAL_PORT` dans `.env.example`).
- Chaque requête porte des assertions ; toute la collection peut s'exécuter en ligne de commande :

```sh
cd bruno
bunx @usebruno/cli run -r --env Local
```

## Endpoints exposés

| Méthode | Route              | Description                                     |
| ------- | ------------------ | ----------------------------------------------- |
| GET     | `/`                | Message d'accueil et liste des endpoints        |
| GET     | `/health`          | État de l'API et durée de fonctionnement        |
| GET     | `/openapi.json`    | Contrat OpenAPI 3.1 de l'API                    |
| GET     | `/planets`      | Liste résumée des planètes (filtrable, triable) |
| GET     | `/planets/{id}` | Détail d'une planète (ex : `/planets/earth`) |
| GET     | `/planets/{id}/moons` | Lunes principales d'une planète (ex : `/planets/mars/moons`) |
| GET     | `/planets/{id}/moons/{moonId}` | Détail d'une lune (ex : `/planets/jupiter/moons/europa`) |
| GET     | `/missions` | 🔒 Liste résumée des missions spatiales (filtrable, triable) |
| POST    | `/missions` | 🔒 Création d'une mission, avec le statut `planned` |
| GET     | `/missions/{id}` | 🔒 Détail d'une mission (ex : `/missions/0c262d45-6bf0-427a-940d-6b02827a0e15`) |
| PATCH   | `/missions/{id}` | 🔒 Mise à jour du statut d'une mission (`active`, puis `completed`) |
| DELETE  | `/missions/{id}` | 🔒 Suppression d'une mission, tant que son statut est `planned` |
| POST    | `/travel-estimation` | Calcul d'une estimation de trajet entre deux planètes |
| POST    | `/auth/login` | Authentification, le token JWT est renvoyé dans le corps ou déposé dans un cookie `httpOnly` (champ `delivery`) |
| POST    | `/auth/logout` | Suppression du cookie d'authentification |
| GET     | `/auth/me` | 🔒 Utilisateur authentifié |

Les routes marquées 🔒 sont privées : elles exigent un token JWT valide (voir [Authentification](#authentification)).

- Toutes les réponses sont au format JSON et comportent un champ `success`, sauf le `204` de `DELETE /missions/{id}`, qui n'a pas de corps.
- Les routes `/planets` renvoient les en-têtes `Cache-Control: public, max-age=3600` et `ETag` (une requête `If-None-Match` à jour reçoit un `304`).
- Les lectures (`GET`) des routes `/missions`, privées, renvoient `Cache-Control: private, no-cache` et `ETag` : la réponse n'est jamais stockée par un cache partagé, et le navigateur la revalide à chaque fois, ce qui revérifie le token.
- CORS est ouvert à toutes les origines, sauf pour les routes `/auth/*` et `/missions` : elles acceptent les cookies (`Access-Control-Allow-Credentials: true`) et ne sont donc ouvertes qu'aux origines listées dans `CORS_ORIGIN`.
- Les données entrantes (paramètres de requête et corps JSON) sont validées par des schémas [zod](https://zod.dev) définis dans `src/schemas.ts` ; le champ `error` de la réponse liste tous les champs en cause (voir [Erreurs](#erreurs) pour les statuts `400`, `409` et `422`).

### GET /

```json
{
  "success": true,
  "message": "Welcome to the Solar System API",
  "endpoints": {
    "health": "/health",
    "openapi": "/openapi.json",
    "planets": ["/planets", "/planets/{id}"],
    "moons": ["/planets/{id}/moons", "/planets/{id}/moons/{moonId}"],
    "missions": ["/missions", "POST /missions", "/missions/{id}", "PATCH /missions/{id}", "DELETE /missions/{id}"],
    "travelEstimation": "POST /travel-estimation",
    "auth": ["POST /auth/login", "POST /auth/logout", "/auth/me"]
  }
}
```

### GET /health

```json
{
  "success": true,
  "message": "Planets API is healthy",
  "uptime": "42s"
}
```

### GET /planets

Paramètres de requête optionnels, combinables :

| Paramètre  | Valeurs                                                                                                                                         | Exemple            |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ |
| `type`     | `terrestrial`, `gas giant`, `ice giant`                                                                                                         | `?type=gas giant`  |
| `hasRings` | `true`, `false`                                                                                                                                 | `?hasRings=true`   |
| `sort`     | `order`, `name`, `diameterKm`, `massKg`, `distanceFromSunAU`, `orbitalPeriodDays`, `rotationPeriodHours`, `moonsCount`, `avgTemperatureCelsius` | `?sort=-diameterKm` |

Le tri est croissant par défaut ; préfixer le champ par `-` pour un tri décroissant. Une valeur invalide renvoie un `400`.

```json
{
  "success": true,
  "data": [
    { "id": "mercury", "name": "Mercury", "order": 1, "type": "terrestrial", "links": { "self": "/planets/mercury" } },
    { "id": "venus", "name": "Venus", "order": 2, "type": "terrestrial", "links": { "self": "/planets/venus" } },
    { "id": "earth", "name": "Earth", "order": 3, "type": "terrestrial", "links": { "self": "/planets/earth" } },
    { "id": "mars", "name": "Mars", "order": 4, "type": "terrestrial", "links": { "self": "/planets/mars" } },
    { "id": "jupiter", "name": "Jupiter", "order": 5, "type": "gas giant", "links": { "self": "/planets/jupiter" } },
    { "id": "saturn", "name": "Saturn", "order": 6, "type": "gas giant", "links": { "self": "/planets/saturn" } },
    { "id": "uranus", "name": "Uranus", "order": 7, "type": "ice giant", "links": { "self": "/planets/uranus" } },
    { "id": "neptune", "name": "Neptune", "order": 8, "type": "ice giant", "links": { "self": "/planets/neptune" } }
  ],
  "message": "List of the Solar System planets with summary information"
}
```

### GET /planets/{id}

L'identifiant est insensible à la casse (`/planets/Earth` fonctionne).

```json
{
  "success": true,
  "data": {
    "id": "earth",
    "name": "Earth",
    "order": 3,
    "type": "terrestrial",
    "diameterKm": 12756,
    "massKg": 5.97e24,
    "distanceFromSunAU": 1,
    "orbitalPeriodDays": 365.25,
    "rotationPeriodHours": 23.93,
    "moonsCount": 1,
    "hasRings": false,
    "avgTemperatureCelsius": 15,
    "description": "The only known planet harboring life, with liquid water on its surface and a protective magnetic field.",
    "links": { "self": "/planets/earth", "moons": "/planets/earth/moons", "missions": "/missions?planet=earth" }
  },
  "message": "Detailed information about planet Earth"
}
```

### GET /planets/{id}/moons

Ressource imbriquée : les lunes n'existent que rattachées à leur planète.

- Seules les lunes principales sont listées ; `moonsCount` sur la planète reste le total réel.
- Une planète sans lune (ex : `/planets/mercury/moons`) renvoie un `200` avec `"data": []`, pas un `404`.

```json
{
  "success": true,
  "data": [
    { "id": "phobos", "name": "Phobos", "links": { "self": "/planets/mars/moons/phobos", "planet": "/planets/mars" } },
    { "id": "deimos", "name": "Deimos", "links": { "self": "/planets/mars/moons/deimos", "planet": "/planets/mars" } }
  ],
  "message": "List of the main moons of planet Mars"
}
```

### GET /planets/{id}/moons/{moonId}

Les deux identifiants sont insensibles à la casse. Une lune rattachée à une autre planète (ex : `/planets/mars/moons/europa`) renvoie un `404`.

```json
{
  "success": true,
  "data": {
    "id": "europa",
    "name": "Europa",
    "planetId": "jupiter",
    "diameterKm": 3122,
    "distanceFromPlanetKm": 671100,
    "orbitalPeriodDays": 3.55,
    "description": "An icy moon hiding a global ocean of liquid water beneath its cracked surface.",
    "links": { "self": "/planets/jupiter/moons/europa", "planet": "/planets/jupiter" }
  },
  "message": "Detailed information about moon Europa of planet Jupiter"
}
```

### GET /missions

Route privée : sans token valide (en-tête `Authorization: Bearer` ou cookie `access_token`), la réponse est un `401`.

```sh
curl http://localhost:3000/missions -H "Authorization: Bearer <accessToken>"
```

Collection de premier niveau : une mission peut étudier plusieurs planètes (relation plusieurs-à-plusieurs), elle n'est donc pas imbriquée sous une planète. La relation s'exprime par le filtre `planet`.

Paramètres de requête optionnels, combinables :

| Paramètre | Valeurs                               | Exemple             |
| --------- | ------------------------------------- | ------------------- |
| `planet`  | identifiant d'une planète             | `?planet=saturn`    |
| `agency`  | `NASA`, `ESA`, `JAXA`, `ISRO`, `CNSA` | `?agency=ESA`       |
| `status`  | `planned`, `active`, `completed`      | `?status=active`    |
| `participating` | `true`, `false`                 | `?participating=true` |
| `sort`    | `launchDate`, `name`, `status`        | `?sort=-launchDate` |

- `agency` est l'agence principale de la mission.
- Avec `sort=launchDate`, les missions sans date de lancement (statut `planned`) sont classées en dernier ; en premier avec `sort=-launchDate`.
- `participating` filtre selon la participation de l'utilisateur connecté : `true` ne garde que ses missions, `false` que les autres (voir ci-dessous).
- Une valeur invalide renvoie un `400` ; une planète sans mission (ex : `?planet=earth`) renvoie un `200` avec `"data": []`.

#### Filtrer selon l'utilisateur connecté

L'API gère une association plusieurs-à-plusieurs entre les utilisateurs et les missions (`src/participations.ts`) : John Doe participe aux missions Juno, Curiosity et Perseverance.

```sh
curl "http://localhost:3000/missions?participating=true" -H "Authorization: Bearer <accessToken>"
```

- L'utilisateur est identifié par la revendication `sub` du token, jamais par un paramètre : il n'existe pas de `?userId=...`. Le client ne peut donc pas demander les participations de quelqu'un d'autre, puisqu'il ne peut pas modifier le token sans en invalider la signature.
- La même URL renvoie un contenu différent selon l'utilisateur. C'est une raison de plus pour que ces réponses soient en `Cache-Control: private` : un cache partagé pourrait servir à un utilisateur la liste d'un autre.
- Le filtre se combine avec les autres (ex : `?participating=true&planet=mars`).

Exemple pour `/missions?planet=uranus` :

```json
{
  "success": true,
  "data": [
    {
      "id": "0c262d45-6bf0-427a-940d-6b02827a0e15",
      "name": "Voyager 2",
      "agency": "NASA",
      "launchDate": "1977-08-20",
      "status": "active",
      "links": { "self": "/missions/0c262d45-6bf0-427a-940d-6b02827a0e15" }
    }
  ],
  "message": "List of space missions with summary information"
}
```

### GET /missions/{id}

Route privée, comme `/missions`. Le token est vérifié avant l'identifiant : sans token, une mission inconnue renvoie un `401` et non un `404`.

L'identifiant est un UUID, insensible à la casse. `planets` liste les planètes étudiées dans l'ordre de visite, avec un lien vers chacune.

```json
{
  "success": true,
  "data": {
    "id": "0c262d45-6bf0-427a-940d-6b02827a0e15",
    "name": "Voyager 2",
    "agency": "NASA",
    "launchDate": "1977-08-20",
    "status": "active",
    "planets": [
      { "id": "jupiter", "name": "Jupiter", "links": { "self": "/planets/jupiter" } },
      { "id": "saturn", "name": "Saturn", "links": { "self": "/planets/saturn" } },
      { "id": "uranus", "name": "Uranus", "links": { "self": "/planets/uranus" } },
      { "id": "neptune", "name": "Neptune", "links": { "self": "/planets/neptune" } }
    ],
    "description": "The only spacecraft to have visited all four giant planets, and still the only one to have flown past Uranus and Neptune.",
    "links": { "self": "/missions/0c262d45-6bf0-427a-940d-6b02827a0e15" }
  },
  "message": "Detailed information about mission Voyager 2"
}
```

### POST /missions

Route privée. Crée une mission dans la collection.

- La mission est toujours créée avec le statut `planned` et sans date de lancement (`"launchDate": null`) : le client ne choisit ni l'un ni l'autre, les champs `status` et `launchDate` envoyés dans le corps sont ignorés.
- L'identifiant est un UUID généré par le serveur : le client ne le choisit pas, un champ `id` envoyé dans le corps est ignoré. Deux missions peuvent donc porter le même nom.
- Une ressource est créée : la réponse est un `201`, avec l'URL de la mission dans l'en-tête `Location` et sa représentation complète dans le corps.
- La persistance est simulée : la mission est ajoutée à la liste en mémoire (`src/missions.ts`). Elle est visible par les autres routes, mais perdue au redémarrage du serveur.

Corps de la requête (`Content-Type: application/json`), tous les champs sont obligatoires :

| Champ         | Type     | Description                                                   |
| ------------- | -------- | ------------------------------------------------------------- |
| `name`        | string   | Nom, non vide                                                 |
| `agency`      | string   | `NASA`, `ESA`, `JAXA`, `ISRO` ou `CNSA`                       |
| `planets`     | string[] | Identifiants des planètes étudiées, au moins un, sans doublon |
| `description` | string   | Description, non vide                                         |

```sh
curl -i -X POST http://localhost:3000/missions \
  -H "Authorization: Bearer <accessToken>" \
  -H "Content-Type: application/json" \
  -d '{"name": "Europa Clipper", "agency": "NASA", "planets": ["mars", "jupiter"], "description": "Studies the ocean under the ice of Europa."}'
```

```
HTTP/1.1 201 Created
Location: /missions/0b6f1c1e-7d2a-4c53-9a55-3f0e8f6f2b41
```

```json
{
  "success": true,
  "data": {
    "id": "0b6f1c1e-7d2a-4c53-9a55-3f0e8f6f2b41",
    "name": "Europa Clipper",
    "agency": "NASA",
    "launchDate": null,
    "status": "planned",
    "planets": [
      { "id": "mars", "name": "Mars", "links": { "self": "/planets/mars" } },
      { "id": "jupiter", "name": "Jupiter", "links": { "self": "/planets/jupiter" } }
    ],
    "description": "Studies the ocean under the ice of Europa.",
    "links": { "self": "/missions/0b6f1c1e-7d2a-4c53-9a55-3f0e8f6f2b41" }
  },
  "message": "Mission Europa Clipper created"
}
```

| Statut | Cas                                                                                     |
| ------ | --------------------------------------------------------------------------------------- |
| `400`  | JSON illisible, champ manquant ou du mauvais type                                       |
| `401`  | Token absent, invalide ou expiré                                                        |
| `422`  | Agence ou planète inconnue, nom ou description vide, planète en double                  |

### PATCH /missions/{id}

Route privée. Met à jour le statut d'une mission. Le verbe est `PATCH` car la mise à jour est partielle : seul le champ `status` est modifiable.

Le cycle de vie est à sens unique : `planned`, puis `active`, puis `completed`. Seul le statut suivant est accepté : une mission ne saute pas d'étape, ne revient pas en arrière, et une mission `completed` ne change plus.

```sh
curl -X PATCH http://localhost:3000/missions/0b6f1c1e-7d2a-4c53-9a55-3f0e8f6f2b41 \
  -H "Authorization: Bearer <accessToken>" \
  -H "Content-Type: application/json" \
  -d '{"status": "active"}'
```

Passer à `active`, c'est lancer la mission : le serveur renseigne alors `launchDate` avec la date du jour (UTC). Le client ne l'envoie pas, et la date est conservée quand la mission passe à `completed`.

La réponse est un `200` avec la représentation complète de la mission, comme `GET /missions/{id}`, et le message `Mission Europa Clipper is now active`.

| Statut | Cas                                                                                 |
| ------ | ----------------------------------------------------------------------------------- |
| `400`  | JSON illisible, champ `status` manquant ou du mauvais type                          |
| `401`  | Token absent, invalide ou expiré                                                    |
| `404`  | Mission inconnue                                                                    |
| `409`  | Statut valide, mais qui n'est pas le suivant dans le cycle de vie de la mission     |
| `422`  | Statut inconnu (ex : `cancelled`)                                                   |

Comme la persistance est simulée en mémoire, le changement de statut est lui aussi perdu au redémarrage du serveur.

### DELETE /missions/{id}

Route privée. Supprime une mission, à condition que son statut soit `planned` : une mission lancée (`active` ou `completed`) ne peut plus être supprimée.

```sh
curl -i -X DELETE http://localhost:3000/missions/0b6f1c1e-7d2a-4c53-9a55-3f0e8f6f2b41 \
  -H "Authorization: Bearer <accessToken>"
```

```
HTTP/1.1 204 No Content
```

- La réponse est un `204` : la suppression a réussi et il n'y a plus rien à renvoyer, la réponse n'a donc pas de corps.
- Une mission `active` ou `completed` renvoie un `409` : la requête est valide, mais en conflit avec l'état de la mission. Les 18 missions d'origine ne sont donc pas supprimables.
- Supprimer une seconde fois la même mission renvoie un `404`, comme pour un identifiant inconnu. `DELETE` reste idempotent : l'état du serveur est le même après un ou plusieurs appels, seul le statut de la réponse change.

| Statut | Cas                              |
| ------ | -------------------------------- |
| `401`  | Token absent, invalide ou expiré |
| `404`  | Mission inconnue ou déjà supprimée |
| `409`  | Mission `active` ou `completed`  |

### POST /travel-estimation

Opération métier : calcule la distance entre deux planètes et la durée du trajet à vitesse constante.

- Le verbe est `POST` car l'opération prend ses paramètres dans le corps de la requête ; la ressource est nommée par un nom (une estimation), pas par un verbe.
- Rien n'est créé ni stocké : la réponse est un `200` (et non un `201`), sans en-tête `Location`, et elle n'est pas mise en cache.
- Modèle simplifié : distance en ligne droite entre les deux orbites au plus proche, à partir des distances moyennes au Soleil.

Corps de la requête (`Content-Type: application/json`), tous les champs sont obligatoires :

| Champ              | Type   | Description                                         |
| ------------------ | ------ | --------------------------------------------------- |
| `from`             | string | Identifiant de la planète de départ                 |
| `to`               | string | Identifiant de la planète d'arrivée, différente de `from` |
| `speedKmPerSecond` | number | Vitesse en km/s, strictement positive               |

```sh
curl -X POST http://localhost:3000/travel-estimation \
  -H "Content-Type: application/json" \
  -d '{"from": "earth", "to": "mars", "speedKmPerSecond": 17}'
```

```json
{
  "success": true,
  "data": {
    "from": { "id": "earth", "name": "Earth", "links": { "self": "/planets/earth" } },
    "to": { "id": "mars", "name": "Mars", "links": { "self": "/planets/mars" } },
    "speedKmPerSecond": 17,
    "distanceAU": 0.52,
    "distanceKm": 77790893,
    "durationSeconds": 4575935,
    "durationDays": 53
  },
  "message": "Estimated travel from Earth to Mars"
}
```

Trois statuts distinguent les erreurs sur le corps :

| Statut | Signification                                   | Cas                                                                                          |
| ------ | ----------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `400`  | Requête mal formée                              | JSON illisible, en-tête `Content-Type: application/json` absent, champ manquant, mauvais type |
| `422`  | Corps bien formé, mais valeur non traitable     | Planète inconnue, vitesse nulle ou négative                                                  |
| `409`  | Valeurs valides, mais en conflit entre elles    | `from` et `to` désignent la même planète                                                     |

Si un corps cumule un problème de forme et une valeur non traitable, c'est le `400` qui l'emporte. Une planète inconnue dans le corps donne un `422` et non un `404` : l'URL `/travel-estimation` existe, c'est la donnée envoyée qui est incorrecte.

### Authentification

L'API ne connaît qu'un seul utilisateur : `john@doe.com` / `azerty` (seule l'empreinte argon2id du mot de passe figure dans le code). Le token JWT est signé en HS256 avec `JWT_SECRET` et expire au bout d'une heure. Son payload identifie l'utilisateur par son id (un UUID) dans la revendication standard `sub`, accompagné de son rôle (`astronaut`) :

```json
{
  "sub": "5f0f4aca-7368-4b38-b2fe-a2ed7925441b",
  "role": "astronaut",
  "iat": 1791100800,
  "exp": 1791104400
}
```

Le payload ne contient pas l'email : un JWT est signé mais pas chiffré, son contenu est lisible par quiconque détient le token. Conformément au principe de minimisation du RGPD, il ne transporte donc que l'identifiant, pseudonyme, et le rôle, nécessaire à l'autorisation ; l'email est relu côté serveur à partir de l'id lorsqu'il est utile (`GET /auth/me`).

#### POST /auth/login

Corps de la requête (`Content-Type: application/json`) :

| Champ      | Type   | Description                                                    |
| ---------- | ------ | -------------------------------------------------------------- |
| `email`    | string | Obligatoire                                                    |
| `password` | string | Obligatoire                                                    |
| `delivery` | string | Optionnel : `token` (par défaut) ou `cookie`                   |

Le champ `delivery` choisit la façon dont le token est remis au client :

| `delivery` | Le token est…                        | Pour…                                  |
| ---------- | ------------------------------------ | -------------------------------------- |
| `token`    | renvoyé dans le corps de la réponse  | un client d'API (script, mobile, back) |
| `cookie`   | déposé dans le cookie `access_token` | une application front end (React…)     |

- Un champ manquant ou du mauvais type renvoie un `400`, une valeur de `delivery` inconnue un `422`, des identifiants incorrects un `401` (`Invalid credentials`, sans préciser lequel des deux est faux).
- Les réponses des routes `/auth/*` portent l'en-tête `Cache-Control: no-store`.

**Avec `delivery: "token"`** (ou sans le champ) :

```sh
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "john@doe.com", "password": "azerty"}'
```

```json
{
  "success": true,
  "data": { "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...", "tokenType": "Bearer", "expiresIn": 3600 },
  "message": "Authentication successful"
}
```

Le client renvoie ensuite le token dans l'en-tête `Authorization` :

```sh
curl http://localhost:3000/auth/me -H "Authorization: Bearer <accessToken>"
```

**Avec `delivery: "cookie"`**, la réponse dépose le cookie et ne contient pas le token :

```
Set-Cookie: access_token=eyJ...; Max-Age=3600; Path=/; HttpOnly; SameSite=Lax
```

```json
{
  "success": true,
  "data": { "id": "5f0f4aca-7368-4b38-b2fe-a2ed7925441b", "email": "john@doe.com", "role": "astronaut", "expiresIn": 3600 },
  "message": "Authentication successful"
}
```

- `HttpOnly` : le cookie est illisible en JavaScript, un script injecté (XSS) ne peut pas voler le token. C'est pour cette raison que le token est absent du corps.
- `SameSite=Lax` : le navigateur ne joint pas le cookie aux requêtes `POST` venant d'un autre site (CSRF).
- `Secure` est ajouté lorsque `NODE_ENV=production` (cookie envoyé uniquement en HTTPS).

Côté front end, il faut demander au navigateur de joindre le cookie, et l'origine du front doit figurer dans `CORS_ORIGIN` :

```js
await fetch("http://localhost:3000/auth/login", {
  method: "POST",
  credentials: "include",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email: "john@doe.com", password: "azerty", delivery: "cookie" }),
});

const res = await fetch("http://localhost:3000/auth/me", { credentials: "include" });
```

#### POST /auth/logout

Supprime le cookie (un cookie `httpOnly` ne peut pas être supprimé en JavaScript). Avec un token transmis par en-tête, il suffit que le client l'oublie.

```json
{ "success": true, "message": "Logged out" }
```

#### GET /auth/me

Route protégée : le token est lu dans l'en-tête `Authorization: Bearer`, à défaut dans le cookie `access_token`. Un token absent, invalide ou expiré renvoie un `401` avec l'en-tête `WWW-Authenticate: Bearer`.

```json
{
  "success": true,
  "data": { "id": "5f0f4aca-7368-4b38-b2fe-a2ed7925441b", "email": "john@doe.com", "role": "astronaut" },
  "message": "Authenticated user"
}
```

Le middleware `authenticate` de `src/auth.ts` protège de la même façon toutes les routes `/missions` (`app.use("/missions/*", authenticate)`), et peut protéger n'importe quelle autre route.

### Erreurs

| Statut | Cas                            | Réponse                                                   |
| ------ | ------------------------------ | --------------------------------------------------------- |
| 400    | Paramètre de requête invalide, ou corps mal formé | `{ "success": false, "error": "Invalid planet: expected one of: ..." }` |
| 409    | Corps dont les valeurs sont en conflit | `{ "success": false, "error": "Conflict between from and to: expected two different planets" }` |
| 409    | Suppression d'une mission lancée | `{ "success": false, "error": "Conflict on status: only a planned mission can be deleted" }` |
| 409    | Changement de statut impossible | `{ "success": false, "error": "Conflict on status: a planned mission can only become active" }` |
| 422    | Corps bien formé avec une valeur non traitable | `{ "success": false, "error": "Invalid speedKmPerSecond: Too small: expected number to be >0" }` |
| 401    | Identifiants incorrects | `{ "success": false, "error": "Invalid credentials" }` |
| 401    | Token absent, invalide ou expiré | `{ "success": false, "error": "Missing, invalid or expired token" }` |
| 404    | Utilisateur du token inexistant | `{ "success": false, "error": "User not found" }` |
| 404    | Planète inconnue               | `{ "success": false, "error": "Planet not found" }`       |
| 404    | Lune inconnue pour cette planète | `{ "success": false, "error": "Moon not found" }`       |
| 404    | Mission inconnue               | `{ "success": false, "error": "Mission not found" }`      |
| 404    | Route inconnue                 | `{ "success": false, "error": "Route not found" }`        |
| 500    | Erreur interne                 | `{ "success": false, "error": "Internal server error" }`  |

--

!["Logotype Shrp"](https://sherpa.one/images/sherpa-logotype.png)

**Alexandre Leroux**  
_Enseignant / Formateur_  
_Développeur logiciel web & mobile_

Nancy (Grand Est, France)

<https://shrp.dev>
