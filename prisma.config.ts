import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // DB lives outside prisma/ so the volume mount in production
    // (data/) does not mask the schema/migrations files in prisma/.
    url: "file:./data/hr.db",
  },
});
