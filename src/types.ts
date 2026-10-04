export const PLANET_TYPES = ["terrestrial", "gas giant", "ice giant"] as const;

export type PlanetType = (typeof PLANET_TYPES)[number];

export type Planet = {
  id: string;
  name: string;
  order: number;
  type: PlanetType;
  diameterKm: number;
  massKg: number;
  distanceFromSunAU: number;
  orbitalPeriodDays: number;
  rotationPeriodHours: number;
  moonsCount: number;
  hasRings: boolean;
  avgTemperatureCelsius: number;
  description: string;
};

export type PlanetSummary = Pick<Planet, "id" | "name" | "order" | "type"> & {
  links: { self: string };
};

export type PlanetDetail = Planet & {
  links: { self: string; moons: string; missions: string };
};

export type Moon = {
  id: string;
  name: string;
  planetId: string;
  diameterKm: number;
  distanceFromPlanetKm: number;
  orbitalPeriodDays: number;
  description: string;
};

type MoonLinks = {
  links: { self: string; planet: string };
};

export type MoonSummary = Pick<Moon, "id" | "name"> & MoonLinks;

export type MoonDetail = Moon & MoonLinks;

export const SORTABLE_FIELDS = [
  "order",
  "name",
  "diameterKm",
  "massKg",
  "distanceFromSunAU",
  "orbitalPeriodDays",
  "rotationPeriodHours",
  "moonsCount",
  "avgTemperatureCelsius",
] as const;

export type SortableField = (typeof SORTABLE_FIELDS)[number];

export const AGENCIES = ["NASA", "ESA", "JAXA", "ISRO", "CNSA"] as const;

export type Agency = (typeof AGENCIES)[number];

// Dans l'ordre du cycle de vie : une mission ne peut passer qu'au statut suivant
export const MISSION_STATUSES = ["planned", "active", "completed"] as const;

export type MissionStatus = (typeof MISSION_STATUSES)[number];

export type Mission = {
  id: string;
  name: string;
  agency: Agency;
  // Inconnue tant que la mission est planifiée : renseignée quand elle devient
  // active
  launchDate: string | null;
  status: MissionStatus;
  planets: string[];
  description: string;
};

type MissionLinks = {
  links: { self: string };
};

export type MissionSummary = Pick<
  Mission,
  "id" | "name" | "agency" | "launchDate" | "status"
> &
  MissionLinks;

export type PlanetReference = Pick<Planet, "id" | "name"> & {
  links: { self: string };
};

export type MissionDetail = Omit<Mission, "planets"> &
  MissionLinks & {
    planets: PlanetReference[];
  };

export type TravelEstimate = {
  from: PlanetReference;
  to: PlanetReference;
  speedKmPerSecond: number;
  distanceAU: number;
  distanceKm: number;
  durationSeconds: number;
  durationDays: number;
};

export const MISSION_SORTABLE_FIELDS = ["launchDate", "name", "status"] as const;

export type MissionSortableField = (typeof MISSION_SORTABLE_FIELDS)[number];

export const TOKEN_DELIVERIES = ["token", "cookie"] as const;

export type TokenDelivery = (typeof TOKEN_DELIVERIES)[number];

export const USER_ROLES = ["astronaut"] as const;

export type UserRole = (typeof USER_ROLES)[number];

export type Participation = {
  userId: string;
  missionId: string;
};
