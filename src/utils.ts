import { Planet, PlanetSummary } from "./types";

export const toSummary = (planet: Planet): PlanetSummary => {
  const { id, name, order, type } = planet;
  return { id, name, order, type };
};
