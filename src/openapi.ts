import {
  AGENCIES,
  MISSION_SORTABLE_FIELDS,
  MISSION_STATUSES,
  PLANET_TYPES,
  SORTABLE_FIELDS,
} from "./types";

const errorResponse = (description: string) => ({
  description,
  content: {
    "application/json": {
      schema: { $ref: "#/components/schemas/Error" },
    },
  },
});

const links = {
  type: "object",
  required: ["self"],
  properties: { self: { type: "string", example: "/planets/earth" } },
};

const moonSummaryProperties = {
  id: { type: "string", example: "europa" },
  name: { type: "string", example: "Europa" },
  links: {
    type: "object",
    required: ["self", "planet"],
    properties: {
      self: { type: "string", example: "/planets/jupiter/moons/europa" },
      planet: { type: "string", example: "/planets/jupiter" },
    },
  },
};

const missionSummaryProperties = {
  id: { type: "string", example: "voyager-2" },
  name: { type: "string", example: "Voyager 2" },
  agency: { type: "string", enum: AGENCIES, description: "Lead agency" },
  launchDate: { type: "string", format: "date", example: "1977-08-20" },
  status: { type: "string", enum: MISSION_STATUSES },
  links: {
    type: "object",
    required: ["self"],
    properties: { self: { type: "string", example: "/missions/voyager-2" } },
  },
};

const planetIdParameter = {
  name: "id",
  in: "path",
  required: true,
  description: "Planet identifier (case-insensitive)",
  schema: { type: "string", example: "jupiter" },
};

const summaryProperties = {
  id: { type: "string", example: "earth" },
  name: { type: "string", example: "Earth" },
  order: { type: "integer", description: "Position from the Sun" },
  type: { type: "string", enum: PLANET_TYPES },
  links,
};

export const openApiDocument = {
  openapi: "3.1.0",
  info: {
    title: "Planets API",
    version: "1.0.0",
    description: "REST API exposing the 8 planets of the Solar System",
  },
  paths: {
    "/health": {
      get: {
        summary: "Health check",
        responses: {
          "200": {
            description: "The API is healthy",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["success", "message", "uptime"],
                  properties: {
                    success: { type: "boolean" },
                    message: { type: "string" },
                    uptime: { type: "string", example: "42s" },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/planets": {
      get: {
        summary: "List planets (summary)",
        parameters: [
          {
            name: "type",
            in: "query",
            description: "Filter by planet type",
            schema: { type: "string", enum: PLANET_TYPES },
          },
          {
            name: "hasRings",
            in: "query",
            description: "Filter on the presence of rings",
            schema: { type: "boolean" },
          },
          {
            name: "sort",
            in: "query",
            description:
              "Field to sort by, prefixed with - for descending order (e.g. -diameterKm)",
            schema: {
              type: "string",
              enum: SORTABLE_FIELDS.flatMap((field) => [field, `-${field}`]),
            },
          },
        ],
        responses: {
          "200": {
            description: "List of planets",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["success", "data", "message"],
                  properties: {
                    success: { type: "boolean" },
                    data: {
                      type: "array",
                      items: { $ref: "#/components/schemas/PlanetSummary" },
                    },
                    message: { type: "string" },
                  },
                },
              },
            },
          },
          "400": errorResponse("Invalid query parameter"),
        },
      },
    },
    "/planets/{id}": {
      get: {
        summary: "Get a planet by id",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            description: "Planet identifier (case-insensitive)",
            schema: { type: "string", example: "earth" },
          },
        ],
        responses: {
          "200": {
            description: "Planet details",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["success", "data", "message"],
                  properties: {
                    success: { type: "boolean" },
                    data: { $ref: "#/components/schemas/Planet" },
                    message: { type: "string" },
                  },
                },
              },
            },
          },
          "404": errorResponse("Planet not found"),
        },
      },
    },
    "/planets/{id}/moons": {
      get: {
        summary: "List the main moons of a planet (summary)",
        parameters: [planetIdParameter],
        responses: {
          "200": {
            description:
              "Main moons of the planet, possibly an empty list (moonsCount on the planet is the real total)",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["success", "data", "message"],
                  properties: {
                    success: { type: "boolean" },
                    data: {
                      type: "array",
                      items: { $ref: "#/components/schemas/MoonSummary" },
                    },
                    message: { type: "string" },
                  },
                },
              },
            },
          },
          "404": errorResponse("Planet not found"),
        },
      },
    },
    "/planets/{id}/moons/{moonId}": {
      get: {
        summary: "Get a moon of a planet",
        parameters: [
          planetIdParameter,
          {
            name: "moonId",
            in: "path",
            required: true,
            description: "Moon identifier (case-insensitive)",
            schema: { type: "string", example: "europa" },
          },
        ],
        responses: {
          "200": {
            description: "Moon details",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["success", "data", "message"],
                  properties: {
                    success: { type: "boolean" },
                    data: { $ref: "#/components/schemas/Moon" },
                    message: { type: "string" },
                  },
                },
              },
            },
          },
          "404": errorResponse(
            "Planet not found, or moon not found for this planet",
          ),
        },
      },
    },
    "/missions": {
      get: {
        summary: "List space missions (summary)",
        parameters: [
          {
            name: "planet",
            in: "query",
            description: "Only the missions that studied this planet (planet id)",
            schema: { type: "string", example: "saturn" },
          },
          {
            name: "agency",
            in: "query",
            description: "Filter by lead agency",
            schema: { type: "string", enum: AGENCIES },
          },
          {
            name: "status",
            in: "query",
            description: "Filter by mission status",
            schema: { type: "string", enum: MISSION_STATUSES },
          },
          {
            name: "sort",
            in: "query",
            description:
              "Field to sort by, prefixed with - for descending order (e.g. -launchDate)",
            schema: {
              type: "string",
              enum: MISSION_SORTABLE_FIELDS.flatMap((field) => [
                field,
                `-${field}`,
              ]),
            },
          },
        ],
        responses: {
          "200": {
            description: "List of missions, possibly empty",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["success", "data", "message"],
                  properties: {
                    success: { type: "boolean" },
                    data: {
                      type: "array",
                      items: { $ref: "#/components/schemas/MissionSummary" },
                    },
                    message: { type: "string" },
                  },
                },
              },
            },
          },
          "400": errorResponse("Invalid query parameter"),
        },
      },
    },
    "/missions/{id}": {
      get: {
        summary: "Get a mission by id",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            description: "Mission identifier (case-insensitive)",
            schema: { type: "string", example: "voyager-2" },
          },
        ],
        responses: {
          "200": {
            description: "Mission details",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["success", "data", "message"],
                  properties: {
                    success: { type: "boolean" },
                    data: { $ref: "#/components/schemas/Mission" },
                    message: { type: "string" },
                  },
                },
              },
            },
          },
          "404": errorResponse("Mission not found"),
        },
      },
    },
    "/travel-estimation": {
      post: {
        summary: "Estimate the travel between two planets",
        description:
          "Computes the distance between the orbits of two planets at their closest (mean distances from the Sun) and the duration of the trip at constant speed. Nothing is stored.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["from", "to", "speedKmPerSecond"],
                properties: {
                  from: {
                    type: "string",
                    description: "Departure planet id",
                    example: "earth",
                  },
                  to: {
                    type: "string",
                    description: "Arrival planet id",
                    example: "mars",
                  },
                  speedKmPerSecond: {
                    type: "number",
                    exclusiveMinimum: 0,
                    example: 17,
                  },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Travel estimate",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["success", "data", "message"],
                  properties: {
                    success: { type: "boolean" },
                    data: { $ref: "#/components/schemas/TravelEstimate" },
                    message: { type: "string" },
                  },
                },
              },
            },
          },
          "400": errorResponse(
            "Malformed request: invalid JSON, missing field or wrong type",
          ),
          "409": errorResponse("Conflict: from and to are the same planet"),
          "422": errorResponse(
            "Well-formed body with a value that cannot be processed: unknown planet or non-positive speed",
          ),
        },
      },
    },
  },
  components: {
    schemas: {
      PlanetReference: {
        type: "object",
        required: ["id", "name", "links"],
        properties: {
          id: { type: "string", example: "jupiter" },
          name: { type: "string", example: "Jupiter" },
          links,
        },
      },
      TravelEstimate: {
        type: "object",
        required: [
          "from",
          "to",
          "speedKmPerSecond",
          "distanceAU",
          "distanceKm",
          "durationSeconds",
          "durationDays",
        ],
        properties: {
          from: { $ref: "#/components/schemas/PlanetReference" },
          to: { $ref: "#/components/schemas/PlanetReference" },
          speedKmPerSecond: { type: "number", example: 17 },
          distanceAU: { type: "number", example: 0.52 },
          distanceKm: { type: "integer", example: 77790893 },
          durationSeconds: { type: "integer", example: 4575935 },
          durationDays: { type: "number", example: 53 },
        },
      },
      MissionSummary: {
        type: "object",
        required: ["id", "name", "agency", "launchDate", "status", "links"],
        properties: missionSummaryProperties,
      },
      Mission: {
        type: "object",
        required: [
          "id",
          "name",
          "agency",
          "launchDate",
          "status",
          "planets",
          "description",
          "links",
        ],
        properties: {
          ...missionSummaryProperties,
          planets: {
            type: "array",
            description: "Planets studied by the mission, in the order they were visited",
            items: { $ref: "#/components/schemas/PlanetReference" },
          },
          description: { type: "string" },
        },
      },
      MoonSummary: {
        type: "object",
        required: ["id", "name", "links"],
        properties: moonSummaryProperties,
      },
      Moon: {
        type: "object",
        required: [
          "id",
          "name",
          "planetId",
          "diameterKm",
          "distanceFromPlanetKm",
          "orbitalPeriodDays",
          "description",
          "links",
        ],
        properties: {
          ...moonSummaryProperties,
          planetId: { type: "string", example: "jupiter" },
          diameterKm: { type: "number" },
          distanceFromPlanetKm: { type: "number" },
          orbitalPeriodDays: { type: "number" },
          description: { type: "string" },
        },
      },
      PlanetSummary: {
        type: "object",
        required: ["id", "name", "order", "type", "links"],
        properties: summaryProperties,
      },
      Planet: {
        type: "object",
        required: [
          "id",
          "name",
          "order",
          "type",
          "diameterKm",
          "massKg",
          "distanceFromSunAU",
          "orbitalPeriodDays",
          "rotationPeriodHours",
          "moonsCount",
          "hasRings",
          "avgTemperatureCelsius",
          "description",
          "links",
        ],
        properties: {
          ...summaryProperties,
          links: {
            type: "object",
            required: ["self", "moons", "missions"],
            properties: {
              self: { type: "string", example: "/planets/earth" },
              moons: { type: "string", example: "/planets/earth/moons" },
              missions: { type: "string", example: "/missions?planet=earth" },
            },
          },
          diameterKm: { type: "number" },
          massKg: { type: "number", example: 5.97e24 },
          distanceFromSunAU: { type: "number" },
          orbitalPeriodDays: { type: "number" },
          rotationPeriodHours: {
            type: "number",
            description: "Negative for a retrograde rotation",
          },
          moonsCount: { type: "integer" },
          hasRings: { type: "boolean" },
          avgTemperatureCelsius: { type: "number" },
          description: { type: "string" },
        },
      },
      Error: {
        type: "object",
        required: ["success", "error"],
        properties: {
          success: { type: "boolean", example: false },
          error: { type: "string" },
        },
      },
    },
  },
};
