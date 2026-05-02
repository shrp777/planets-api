export type PlanetSummary = {
  id: string;
  name: string;
  order: number;
  type: "terrestrial" | "gas giant" | "ice giant";
};

export type Planet = PlanetSummary & {
  diameterKm: number;
  massKg: string;
  distanceFromSunAU: number;
  orbitalPeriodDays: number;
  rotationPeriodHours: number;
  moonsCount: number;
  hasRings: boolean;
  avgTemperatureCelsius: number;
  description: string;
};
