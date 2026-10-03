import type { Planet, TravelEstimate } from "./types";
import { toPlanetReference } from "./utils";

const KM_PER_AU = 149_597_870.7;
const SECONDS_PER_DAY = 86_400;

const round = (value: number, decimals: number) => {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
};

// Simplified model: straight line between the two orbits at their closest,
// using mean distances from the Sun, at constant speed
export const estimateTravel = (
  from: Planet,
  to: Planet,
  speedKmPerSecond: number,
): TravelEstimate => {
  const distanceAU = Math.abs(to.distanceFromSunAU - from.distanceFromSunAU);
  const distanceKm = distanceAU * KM_PER_AU;
  const durationSeconds = distanceKm / speedKmPerSecond;
  return {
    from: toPlanetReference(from),
    to: toPlanetReference(to),
    speedKmPerSecond,
    distanceAU: round(distanceAU, 2),
    distanceKm: Math.round(distanceKm),
    durationSeconds: Math.round(durationSeconds),
    durationDays: round(durationSeconds / SECONDS_PER_DAY, 1),
  };
};
