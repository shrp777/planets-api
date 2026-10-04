import type { Mission } from "./types";

// Une mission peut étudier plusieurs planètes, elle n'est donc pas imbriquée
// sous une planète. Les planètes d'une mission sont listées dans l'ordre de
// visite.
export const missions: Mission[] = [
  {
    id: "pioneer-11",
    name: "Pioneer 11",
    agency: "NASA",
    launchDate: "1973-04-06",
    status: "completed",
    planets: ["jupiter", "saturn"],
    description:
      "The first spacecraft to fly past Saturn, after using Jupiter's gravity to change course.",
  },
  {
    id: "mariner-10",
    name: "Mariner 10",
    agency: "NASA",
    launchDate: "1973-11-03",
    status: "completed",
    planets: ["venus", "mercury"],
    description:
      "The first mission to visit two planets and the first to use a gravity assist, flying past Venus on its way to Mercury.",
  },
  {
    id: "viking-1",
    name: "Viking 1",
    agency: "NASA",
    launchDate: "1975-08-20",
    status: "completed",
    planets: ["mars"],
    description:
      "An orbiter and lander pair; the lander was the first to operate successfully on the surface of Mars.",
  },
  {
    id: "voyager-2",
    name: "Voyager 2",
    agency: "NASA",
    launchDate: "1977-08-20",
    status: "active",
    planets: ["jupiter", "saturn", "uranus", "neptune"],
    description:
      "The only spacecraft to have visited all four giant planets, and still the only one to have flown past Uranus and Neptune.",
  },
  {
    id: "voyager-1",
    name: "Voyager 1",
    agency: "NASA",
    launchDate: "1977-09-05",
    status: "active",
    planets: ["jupiter", "saturn"],
    description:
      "Flew past Jupiter and Saturn before becoming the most distant human-made object and the first to reach interstellar space.",
  },
  {
    id: "magellan",
    name: "Magellan",
    agency: "NASA",
    launchDate: "1989-05-04",
    status: "completed",
    planets: ["venus"],
    description:
      "Mapped almost the entire surface of Venus with radar, seeing through its thick clouds.",
  },
  {
    id: "galileo",
    name: "Galileo",
    agency: "NASA",
    launchDate: "1989-10-18",
    status: "completed",
    planets: ["jupiter"],
    description:
      "The first spacecraft to orbit Jupiter; it dropped a probe into the atmosphere and found evidence of an ocean under Europa's ice.",
  },
  {
    id: "cassini-huygens",
    name: "Cassini-Huygens",
    agency: "NASA",
    launchDate: "1997-10-15",
    status: "completed",
    planets: ["saturn"],
    description:
      "Orbited Saturn for 13 years with ESA and ASI, and landed the Huygens probe on Titan.",
  },
  {
    id: "mars-express",
    name: "Mars Express",
    agency: "ESA",
    launchDate: "2003-06-02",
    status: "active",
    planets: ["mars"],
    description:
      "Europe's first planetary mission, an orbiter that detected water ice and mapped the Martian surface in 3D.",
  },
  {
    id: "messenger",
    name: "MESSENGER",
    agency: "NASA",
    launchDate: "2004-08-03",
    status: "completed",
    planets: ["mercury"],
    description:
      "The first spacecraft to orbit Mercury, where it found water ice in permanently shadowed polar craters.",
  },
  {
    id: "venus-express",
    name: "Venus Express",
    agency: "ESA",
    launchDate: "2005-11-09",
    status: "completed",
    planets: ["venus"],
    description:
      "Studied the atmosphere of Venus from orbit for eight years, tracking its super-rotating winds.",
  },
  {
    id: "akatsuki",
    name: "Akatsuki",
    agency: "JAXA",
    launchDate: "2010-05-20",
    status: "completed",
    planets: ["venus"],
    description:
      "A Japanese climate orbiter that reached Venus on its second attempt, five years after missing its first orbit insertion.",
  },
  {
    id: "juno",
    name: "Juno",
    agency: "NASA",
    launchDate: "2011-08-05",
    status: "active",
    planets: ["jupiter"],
    description:
      "A solar-powered orbiter on a polar orbit, studying Jupiter's interior, magnetic field and auroras.",
  },
  {
    id: "curiosity",
    name: "Curiosity",
    agency: "NASA",
    launchDate: "2011-11-26",
    status: "active",
    planets: ["mars"],
    description:
      "A car-sized rover exploring Gale crater, which showed that ancient Mars could have supported microbial life.",
  },
  {
    id: "mars-orbiter-mission",
    name: "Mars Orbiter Mission",
    agency: "ISRO",
    launchDate: "2013-11-05",
    status: "completed",
    planets: ["mars"],
    description:
      "Also known as Mangalyaan, it made India the first nation to reach Mars orbit on its first attempt.",
  },
  {
    id: "bepicolombo",
    name: "BepiColombo",
    agency: "ESA",
    launchDate: "2018-10-20",
    status: "active",
    planets: ["venus", "mercury"],
    description:
      "A joint mission with JAXA carrying two orbiters to Mercury, with flybys of Venus on the way.",
  },
  {
    id: "tianwen-1",
    name: "Tianwen-1",
    agency: "CNSA",
    launchDate: "2020-07-23",
    status: "active",
    planets: ["mars"],
    description:
      "China's first Mars mission, combining an orbiter, a lander and the Zhurong rover.",
  },
  {
    id: "perseverance",
    name: "Perseverance",
    agency: "NASA",
    launchDate: "2020-07-30",
    status: "active",
    planets: ["mars"],
    description:
      "A rover collecting rock samples in Jezero crater; it carried Ingenuity, the first helicopter to fly on another planet.",
  },
];
