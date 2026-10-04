import type { Participation } from "./types";

// Association plusieurs-à-plusieurs entre les utilisateurs et les missions :
// un utilisateur participe à plusieurs missions, une mission compte plusieurs
// participants
export const participations: Participation[] = [
  // Juno
  {
    userId: "5f0f4aca-7368-4b38-b2fe-a2ed7925441b",
    missionId: "86772d6f-cba8-4d8b-baf3-3aea860a72e3",
  },
  // Curiosity
  {
    userId: "5f0f4aca-7368-4b38-b2fe-a2ed7925441b",
    missionId: "ceacd7d1-3cfb-4a82-987c-cc91354882c1",
  },
  // Perseverance
  {
    userId: "5f0f4aca-7368-4b38-b2fe-a2ed7925441b",
    missionId: "75f25193-1024-4794-b2c8-ff34c17b0cc9",
  },
];
