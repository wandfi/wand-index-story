import { story } from "@/configs/network";
import { getPCBy } from "@/lib/publicClient";
import { cacheGet, createRunWithPool } from "@/lib/utils";
import { type EntityManager } from "typeorm";
import { AppDS } from "./ds";
import { index_config, tables } from "./tables";

export async function getIndexConfig(name: string, def = 0n) {
  const ic = await AppDS.manager.findOne(index_config, { where: { name }, select: ["vaule"] });
  return ic?.vaule || def;
}

export async function upIndexConfig(name: string, vaule: bigint, ma: EntityManager = AppDS.manager) {
  await ma.upsert(index_config, { name, vaule }, ["name"]);
}

export const runTransWithPool = createRunWithPool();

export async function cacheGetTimeByBlock(chain: number, block: bigint) {
  if (chain == story.id) {
    let bt = await AppDS.manager.findOne(tables.index_block_time, { where: { block }, select: ["time"] });
    if (!bt) {
      const b = await getPCBy({ chain, name: "default" }).getBlock({ blockNumber: block });
      const time = parseInt(b.timestamp.toString());
      await AppDS.manager.upsert(tables.index_block_time, { block, time }, ["block"]);
      return time;
    }
    return bt!.time;
  }

  let bt = await AppDS.manager.findOne(tables.index_block_time_v2, { where: { block, chain }, select: ["time"] });
  if (!bt) {
    const b = await getPCBy({ chain, name: "default" }).getBlock({ blockNumber: block });
    const time = parseInt(b.timestamp.toString());
    await AppDS.manager.upsert(tables.index_block_time_v2, { chain, block, time }, ["chain", "block"]);
    return time;
  }
  return bt!.time;
}

export async function cacheGetBlocks1Hour(chainId: number) {
  return cacheGet(
    `Blocks1Hourby-${chainId}`,
    async () => {
      const pc = getPCBy({ chain: chainId, name: "default" });
      const latest = await pc.getBlock({ blockTag: "finalized" });
      const old = await pc.getBlock({ blockNumber: latest.number - 100000n > 0n ? latest.number - 100000n : 1n });
      const blocksPerHour = ((latest.number - old.number) * 60n * 60n) / (latest.timestamp - old.timestamp);
      return blocksPerHour;
    },
    24 * 3600 * 1000
  );
}
