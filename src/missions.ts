import type { Mission } from "./types";

// Une mission peut étudier plusieurs planètes, elle n'est donc pas imbriquée
// sous une planète. Les planètes d'une mission sont listées dans l'ordre de
// visite. L'identifiant est un UUID, comme celui que l'API génère pour une
// mission créée. La liste est modifiable : elle tient lieu de base de données pour les
// missions créées ou mises à jour par l'API.
export const missions: Mission[] = [
  {
    id: "ad7c914b-3caf-493a-a2a6-de89c26351bb",
    name: "Pioneer 11",
    agency: "NASA",
    launchDate: "1973-04-06",
    status: "completed",
    planets: ["jupiter", "saturn"],
    description:
      "The first spacecraft to fly past Saturn, after using Jupiter's gravity to change course.",
  },
  {
    id: "0a1750be-dcdc-4070-aea1-c38628104eb5",
    name: "Mariner 10",
    agency: "NASA",
    launchDate: "1973-11-03",
    status: "completed",
    planets: ["venus", "mercury"],
    description:
      "The first mission to visit two planets and the first to use a gravity assist, flying past Venus on its way to Mercury.",
  },
  {
    id: "66738e0c-534c-48ab-a71f-ef68aacba35b",
    name: "Viking 1",
    agency: "NASA",
    launchDate: "1975-08-20",
    status: "completed",
    planets: ["mars"],
    description:
      "An orbiter and lander pair; the lander was the first to operate successfully on the surface of Mars.",
  },
  {
    id: "0c262d45-6bf0-427a-940d-6b02827a0e15",
    name: "Voyager 2",
    agency: "NASA",
    launchDate: "1977-08-20",
    status: "active",
    planets: ["jupiter", "saturn", "uranus", "neptune"],
    description:
      "The only spacecraft to have visited all four giant planets, and still the only one to have flown past Uranus and Neptune.",
  },
  {
    id: "80adb097-d842-4146-af27-71bcc2221e65",
    name: "Voyager 1",
    agency: "NASA",
    launchDate: "1977-09-05",
    status: "active",
    planets: ["jupiter", "saturn"],
    description:
      "Flew past Jupiter and Saturn before becoming the most distant human-made object and the first to reach interstellar space.",
  },
  {
    id: "f6a165eb-91fc-4e18-9e0c-99f6775eaee9",
    name: "Magellan",
    agency: "NASA",
    launchDate: "1989-05-04",
    status: "completed",
    planets: ["venus"],
    description:
      "Mapped almost the entire surface of Venus with radar, seeing through its thick clouds.",
  },
  {
    id: "a458e491-2b31-44b8-8f4a-fc24a29ec705",
    name: "Galileo",
    agency: "NASA",
    launchDate: "1989-10-18",
    status: "completed",
    planets: ["jupiter"],
    description:
      "The first spacecraft to orbit Jupiter; it dropped a probe into the atmosphere and found evidence of an ocean under Europa's ice.",
  },
  {
    id: "b78947f2-c942-49de-9971-d17fcffbbebb",
    name: "Cassini-Huygens",
    agency: "NASA",
    launchDate: "1997-10-15",
    status: "completed",
    planets: ["saturn"],
    description:
      "Orbited Saturn for 13 years with ESA and ASI, and landed the Huygens probe on Titan.",
  },
  {
    id: "d1ffe9a1-47bb-4ea0-bbc2-a8213a0c5e3c",
    name: "Mars Express",
    agency: "ESA",
    launchDate: "2003-06-02",
    status: "active",
    planets: ["mars"],
    description:
      "Europe's first planetary mission, an orbiter that detected water ice and mapped the Martian surface in 3D.",
  },
  {
    id: "bf13e74b-d5ac-4df4-858f-153626461146",
    name: "MESSENGER",
    agency: "NASA",
    launchDate: "2004-08-03",
    status: "completed",
    planets: ["mercury"],
    description:
      "The first spacecraft to orbit Mercury, where it found water ice in permanently shadowed polar craters.",
  },
  {
    id: "6a3761fe-80e8-4afa-8ac5-911a2b85b1d8",
    name: "Venus Express",
    agency: "ESA",
    launchDate: "2005-11-09",
    status: "completed",
    planets: ["venus"],
    description:
      "Studied the atmosphere of Venus from orbit for eight years, tracking its super-rotating winds.",
  },
  {
    id: "b6dc4634-bfba-46ad-ba25-c1b67433a9f4",
    name: "Akatsuki",
    agency: "JAXA",
    launchDate: "2010-05-20",
    status: "completed",
    planets: ["venus"],
    description:
      "A Japanese climate orbiter that reached Venus on its second attempt, five years after missing its first orbit insertion.",
  },
  {
    id: "86772d6f-cba8-4d8b-baf3-3aea860a72e3",
    name: "Juno",
    agency: "NASA",
    launchDate: "2011-08-05",
    status: "active",
    planets: ["jupiter"],
    description:
      "A solar-powered orbiter on a polar orbit, studying Jupiter's interior, magnetic field and auroras.",
  },
  {
    id: "ceacd7d1-3cfb-4a82-987c-cc91354882c1",
    name: "Curiosity",
    agency: "NASA",
    launchDate: "2011-11-26",
    status: "active",
    planets: ["mars"],
    description:
      "A car-sized rover exploring Gale crater, which showed that ancient Mars could have supported microbial life.",
  },
  {
    id: "313646b3-c21f-41ad-b3ac-2706c38b4ca4",
    name: "Mars Orbiter Mission",
    agency: "ISRO",
    launchDate: "2013-11-05",
    status: "completed",
    planets: ["mars"],
    description:
      "Also known as Mangalyaan, it made India the first nation to reach Mars orbit on its first attempt.",
  },
  {
    id: "aa0fec3d-68b5-4a95-8b5b-7eba03d9b21c",
    name: "BepiColombo",
    agency: "ESA",
    launchDate: "2018-10-20",
    status: "active",
    planets: ["venus", "mercury"],
    description:
      "A joint mission with JAXA carrying two orbiters to Mercury, with flybys of Venus on the way.",
  },
  {
    id: "4d6e8329-a268-4f51-a3d8-3ce34bfee015",
    name: "Tianwen-1",
    agency: "CNSA",
    launchDate: "2020-07-23",
    status: "active",
    planets: ["mars"],
    description:
      "China's first Mars mission, combining an orbiter, a lander and the Zhurong rover.",
  },
  {
    id: "75f25193-1024-4794-b2c8-ff34c17b0cc9",
    name: "Perseverance",
    agency: "NASA",
    launchDate: "2020-07-30",
    status: "active",
    planets: ["mars"],
    description:
      "A rover collecting rock samples in Jezero crater; it carried Ingenuity, the first helicopter to fly on another planet.",
  },
];
