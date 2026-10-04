import { planets } from "./planets";
import type {
  Mission,
  MissionDetail,
  MissionSummary,
  Moon,
  MoonDetail,
  MoonSummary,
  Planet,
  PlanetDetail,
  PlanetReference,
  PlanetSummary,
} from "./types";

const planetLink = (planetId: string) => `/planets/${planetId}`;
const moonsLink = (planetId: string) => `${planetLink(planetId)}/moons`;
const missionLink = (missionId: string) => `/missions/${missionId}`;

const moonLinks = (moon: Moon) => ({
  self: `${moonsLink(moon.planetId)}/${moon.id}`,
  planet: planetLink(moon.planetId),
});

export const toSummary = (planet: Planet): PlanetSummary => {
  const { id, name, order, type } = planet;
  return { id, name, order, type, links: { self: planetLink(id) } };
};

export const toDetail = (planet: Planet): PlanetDetail => {
  return {
    ...planet,
    links: {
      self: planetLink(planet.id),
      moons: moonsLink(planet.id),
      missions: `/missions?planet=${planet.id}`,
    },
  };
};

export const toPlanetReference = (planet: Planet): PlanetReference => {
  const { id, name } = planet;
  return { id, name, links: { self: planetLink(id) } };
};

export const toMoonSummary = (moon: Moon): MoonSummary => {
  const { id, name } = moon;
  return { id, name, links: moonLinks(moon) };
};

export const toMoonDetail = (moon: Moon): MoonDetail => {
  return { ...moon, links: moonLinks(moon) };
};

export const toMissionSummary = (mission: Mission): MissionSummary => {
  const { id, name, agency, launchDate, status } = mission;
  return {
    id,
    name,
    agency,
    launchDate,
    status,
    links: { self: missionLink(id) },
  };
};

export const toMissionDetail = (mission: Mission): MissionDetail => {
  return {
    ...mission,
    planets: mission.planets.flatMap((planetId) => {
      const planet = planets.find((p) => p.id === planetId);
      return planet ? [toPlanetReference(planet)] : [];
    }),
    links: { self: missionLink(mission.id) },
  };
};

export const sortBy = <T>(
  items: T[],
  field: keyof T,
  descending: boolean,
): T[] => {
  const direction = descending ? -1 : 1;
  return [...items].sort((a, b) => {
    const x = a[field];
    const y = b[field];
    // Une valeur absente (mission pas encore lancée) est classée après les
    // autres
    if (x === null || y === null) {
      return (Number(x === null) - Number(y === null)) * direction;
    }
    const result =
      typeof x === "string" && typeof y === "string"
        ? x.localeCompare(y)
        : Number(x) - Number(y);
    return result * direction;
  });
};
