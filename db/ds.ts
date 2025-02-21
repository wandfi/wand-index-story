import { CONFIGS } from "@/configs";
import { DataSource } from "typeorm";
import { tables } from "./tables";

export const AppDS = CONFIGS.postgres_url
  ? new DataSource({
      type: "postgres",
      url: CONFIGS.postgres_url,
      synchronize: true,
      entities: Object.values(tables),
    })
  : new DataSource({
      type: "mysql",
      connectorPackage: "mysql2",
      supportBigNumbers: true,
      synchronize: true,
      logging: ["error"],
      logger: "simple-console",
      ...CONFIGS.db,
      entities: Object.values(tables),
    });
