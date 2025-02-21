import { createRunWithPool } from "@/lib/utils";
import type { EntityManager } from "typeorm";
import { AppDS } from "./ds";
import { index_config } from "./tables";

export async function getIndexConfig(name: string, def = 0n) {
  const ic = await AppDS.manager.findOne(index_config, { where: { name }, select: ["vaule"] });
  return ic?.vaule || def;
}

export async function upIndexConfig(name: string, vaule: bigint, ma: EntityManager = AppDS.manager) {
  await ma.upsert(index_config, { name, vaule }, ["name"]);
}

export const runTransWithPool = createRunWithPool();
