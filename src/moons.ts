import type { Moon } from "./types";

// Only the main moons are listed: a planet's moonsCount is its real total
export const moons: Moon[] = [
  {
    id: "moon",
    name: "Moon",
    planetId: "earth",
    diameterKm: 3475,
    distanceFromPlanetKm: 384400,
    orbitalPeriodDays: 27.32,
    description:
      "Earth's only natural satellite, responsible for the tides and the only other world visited by humans.",
  },
  {
    id: "phobos",
    name: "Phobos",
    planetId: "mars",
    diameterKm: 22.2,
    distanceFromPlanetKm: 9376,
    orbitalPeriodDays: 0.32,
    description:
      "The larger and closer of Mars's two moons, orbiting faster than the planet rotates and slowly spiralling inward.",
  },
  {
    id: "deimos",
    name: "Deimos",
    planetId: "mars",
    diameterKm: 12.4,
    distanceFromPlanetKm: 23463,
    orbitalPeriodDays: 1.26,
    description:
      "The smaller, outer moon of Mars, a potato-shaped body covered in smooth regolith.",
  },
  {
    id: "io",
    name: "Io",
    planetId: "jupiter",
    diameterKm: 3643,
    distanceFromPlanetKm: 421700,
    orbitalPeriodDays: 1.77,
    description:
      "The most volcanically active body in the solar system, heated by Jupiter's tidal forces.",
  },
  {
    id: "europa",
    name: "Europa",
    planetId: "jupiter",
    diameterKm: 3122,
    distanceFromPlanetKm: 671100,
    orbitalPeriodDays: 3.55,
    description:
      "An icy moon hiding a global ocean of liquid water beneath its cracked surface.",
  },
  {
    id: "ganymede",
    name: "Ganymede",
    planetId: "jupiter",
    diameterKm: 5268,
    distanceFromPlanetKm: 1070400,
    orbitalPeriodDays: 7.15,
    description:
      "The largest moon in the solar system, bigger than Mercury, and the only one with its own magnetic field.",
  },
  {
    id: "callisto",
    name: "Callisto",
    planetId: "jupiter",
    diameterKm: 4821,
    distanceFromPlanetKm: 1882700,
    orbitalPeriodDays: 16.69,
    description:
      "One of the most heavily cratered bodies known, with an ancient surface almost unchanged for billions of years.",
  },
  {
    id: "mimas",
    name: "Mimas",
    planetId: "saturn",
    diameterKm: 396,
    distanceFromPlanetKm: 185540,
    orbitalPeriodDays: 0.94,
    description:
      "A small icy moon dominated by the giant Herschel crater, which spans a third of its diameter.",
  },
  {
    id: "enceladus",
    name: "Enceladus",
    planetId: "saturn",
    diameterKm: 504,
    distanceFromPlanetKm: 238040,
    orbitalPeriodDays: 1.37,
    description:
      "A bright icy moon whose south pole shoots geysers of water from a subsurface ocean into space.",
  },
  {
    id: "tethys",
    name: "Tethys",
    planetId: "saturn",
    diameterKm: 1062,
    distanceFromPlanetKm: 294670,
    orbitalPeriodDays: 1.89,
    description:
      "An almost pure water-ice moon scarred by the huge Odysseus crater and the Ithaca Chasma canyon.",
  },
  {
    id: "dione",
    name: "Dione",
    planetId: "saturn",
    diameterKm: 1123,
    distanceFromPlanetKm: 377420,
    orbitalPeriodDays: 2.74,
    description:
      "An icy moon streaked with bright cliffs of ice on its trailing hemisphere.",
  },
  {
    id: "rhea",
    name: "Rhea",
    planetId: "saturn",
    diameterKm: 1527,
    distanceFromPlanetKm: 527070,
    orbitalPeriodDays: 4.52,
    description:
      "Saturn's second-largest moon, a heavily cratered ball of ice and rock.",
  },
  {
    id: "titan",
    name: "Titan",
    planetId: "saturn",
    diameterKm: 5150,
    distanceFromPlanetKm: 1221870,
    orbitalPeriodDays: 15.95,
    description:
      "The only moon with a thick atmosphere, with lakes and rivers of liquid methane on its surface.",
  },
  {
    id: "iapetus",
    name: "Iapetus",
    planetId: "saturn",
    diameterKm: 1469,
    distanceFromPlanetKm: 3560840,
    orbitalPeriodDays: 79.33,
    description:
      "A two-toned moon with one dark and one bright hemisphere, and a mountain ridge running along its equator.",
  },
  {
    id: "miranda",
    name: "Miranda",
    planetId: "uranus",
    diameterKm: 472,
    distanceFromPlanetKm: 129900,
    orbitalPeriodDays: 1.41,
    description:
      "A small moon with a patchwork surface and Verona Rupes, one of the tallest cliffs in the solar system.",
  },
  {
    id: "ariel",
    name: "Ariel",
    planetId: "uranus",
    diameterKm: 1158,
    distanceFromPlanetKm: 190900,
    orbitalPeriodDays: 2.52,
    description:
      "The brightest of Uranus's moons, crossed by networks of valleys and relatively young terrain.",
  },
  {
    id: "umbriel",
    name: "Umbriel",
    planetId: "uranus",
    diameterKm: 1169,
    distanceFromPlanetKm: 266000,
    orbitalPeriodDays: 4.14,
    description:
      "The darkest of Uranus's large moons, with an old, heavily cratered surface.",
  },
  {
    id: "titania",
    name: "Titania",
    planetId: "uranus",
    diameterKm: 1577,
    distanceFromPlanetKm: 436300,
    orbitalPeriodDays: 8.71,
    description:
      "The largest moon of Uranus, marked by huge canyons and fault scarps.",
  },
  {
    id: "oberon",
    name: "Oberon",
    planetId: "uranus",
    diameterKm: 1523,
    distanceFromPlanetKm: 583500,
    orbitalPeriodDays: 13.46,
    description:
      "The outermost large moon of Uranus, covered in craters with dark material on their floors.",
  },
  {
    id: "triton",
    name: "Triton",
    planetId: "neptune",
    diameterKm: 2707,
    distanceFromPlanetKm: 354760,
    orbitalPeriodDays: 5.88,
    description:
      "Neptune's largest moon, orbiting backwards and erupting nitrogen geysers; probably a captured Kuiper Belt object.",
  },
  {
    id: "proteus",
    name: "Proteus",
    planetId: "neptune",
    diameterKm: 420,
    distanceFromPlanetKm: 117650,
    orbitalPeriodDays: 1.12,
    description:
      "A dark, irregularly shaped moon, about as large as a body can be without being pulled into a sphere.",
  },
  {
    id: "nereid",
    name: "Nereid",
    planetId: "neptune",
    diameterKm: 340,
    distanceFromPlanetKm: 5513800,
    orbitalPeriodDays: 360.13,
    description:
      "A small moon with one of the most eccentric orbits of any known satellite.",
  },
];
