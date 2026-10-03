# Planets API

API REST exposant les 8 planètes du système solaire.

## Variables d'environnement

- Créer un fichier `.env` à partir du fichier `.env.example`

- **PORT** = port employé dans le conteneur Docker
- **EXTERNAL_PORT** = port employé sur la machine hôte

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
| GET     | `/missions` | Liste résumée des missions spatiales (filtrable, triable) |
| GET     | `/missions/{id}` | Détail d'une mission (ex : `/missions/voyager-2`) |
| POST    | `/travel-estimation` | Calcul d'une estimation de trajet entre deux planètes |

- Toutes les réponses sont au format JSON et comportent un champ `success`.
- Les routes `/planets` et `/missions` renvoient les en-têtes `Cache-Control: public, max-age=3600` et `ETag` (une requête `If-None-Match` à jour reçoit un `304`).
- CORS est ouvert à toutes les origines.
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
    "missions": ["/missions", "/missions/{id}"],
    "travelEstimation": "POST /travel-estimation"
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

Collection de premier niveau : une mission peut étudier plusieurs planètes (relation plusieurs-à-plusieurs), elle n'est donc pas imbriquée sous une planète. La relation s'exprime par le filtre `planet`.

Paramètres de requête optionnels, combinables :

| Paramètre | Valeurs                               | Exemple             |
| --------- | ------------------------------------- | ------------------- |
| `planet`  | identifiant d'une planète             | `?planet=saturn`    |
| `agency`  | `NASA`, `ESA`, `JAXA`, `ISRO`, `CNSA` | `?agency=ESA`       |
| `status`  | `active`, `completed`                 | `?status=active`    |
| `sort`    | `launchDate`, `name`                  | `?sort=-launchDate` |

- `agency` est l'agence principale de la mission.
- Une valeur invalide renvoie un `400` ; une planète sans mission (ex : `?planet=earth`) renvoie un `200` avec `"data": []`.

Exemple pour `/missions?planet=uranus` :

```json
{
  "success": true,
  "data": [
    {
      "id": "voyager-2",
      "name": "Voyager 2",
      "agency": "NASA",
      "launchDate": "1977-08-20",
      "status": "active",
      "links": { "self": "/missions/voyager-2" }
    }
  ],
  "message": "List of space missions with summary information"
}
```

### GET /missions/{id}

L'identifiant est insensible à la casse. `planets` liste les planètes étudiées dans l'ordre de visite, avec un lien vers chacune.

```json
{
  "success": true,
  "data": {
    "id": "voyager-2",
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
    "links": { "self": "/missions/voyager-2" }
  },
  "message": "Detailed information about mission Voyager 2"
}
```

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

### Erreurs

| Statut | Cas                            | Réponse                                                   |
| ------ | ------------------------------ | --------------------------------------------------------- |
| 400    | Paramètre de requête invalide, ou corps mal formé | `{ "success": false, "error": "Invalid planet: expected one of: ..." }` |
| 409    | Corps dont les valeurs sont en conflit | `{ "success": false, "error": "Conflict between from and to: expected two different planets" }` |
| 422    | Corps bien formé avec une valeur non traitable | `{ "success": false, "error": "Invalid speedKmPerSecond: Too small: expected number to be >0" }` |
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
