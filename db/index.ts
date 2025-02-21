import { CONFIGS } from "@/configs";
import { createConnection } from "mysql2/promise";
import { AppDS } from "./ds";
export * from "./ds";
export * from "./tables";

async function createDb() {
  try {
    const { host, port, username, password, database } = CONFIGS.db;
    const connection = await createConnection({ host, port, user: username, password });
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${database}\`  CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci`);
    await connection.end();
  } catch (error) {
    console.info("database:", CONFIGS.db);
    throw error;
  }
}

export async function prepareDB() {
  await createDb();
  await AppDS.initialize();
}
