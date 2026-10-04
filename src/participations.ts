import type { Participation } from "./types";

// Association plusieurs-à-plusieurs entre les utilisateurs et les missions :
// un utilisateur participe à plusieurs missions, une mission compte plusieurs
// participants
export const participations: Participation[] = [
  { userId: "5f0f4aca-7368-4b38-b2fe-a2ed7925441b", missionId: "juno" },
  { userId: "5f0f4aca-7368-4b38-b2fe-a2ed7925441b", missionId: "curiosity" },
  { userId: "5f0f4aca-7368-4b38-b2fe-a2ed7925441b", missionId: "perseverance" },
];
