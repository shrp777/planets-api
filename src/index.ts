import { app } from "./app";

// Échoue au démarrage plutôt qu'à la première connexion
if (!Bun.env.JWT_SECRET) {
  throw new Error("JWT_SECRET environment variable is not set");
}

export default {
  port: Bun.env.PORT,
  fetch: app.fetch,
};
