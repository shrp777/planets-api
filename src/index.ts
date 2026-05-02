import { app } from "./app";

export default {
  port: Bun.env.PORT,
  fetch: app.fetch,
};
