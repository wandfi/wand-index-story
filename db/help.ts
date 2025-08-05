import { sepolia, story, SUPPORT_CHAINS } from "@/configs/network";
import { createRunWithPool } from "@/lib/utils";
import { indexBlockTimeV2NameBy } from "@/schedule/index_block_time_v2";
import { MoreThanOrEqual, type EntityManager } from "typeorm";
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

export async function getIndexedBlockTime(chain: number) {
  if (!SUPPORT_CHAINS.find((item) => item.id === chain)) throw new Error("Not supported chain");
  if (chain == story.id) {
    const block = await getIndexConfig("index_block_time");
    const item = await AppDS.manager.findOneBy(tables.index_block_time, { block });
    return { block, time: item?.time ?? 0 };
  }
  if (chain == sepolia.id) {
    const block = await getIndexConfig("index_block_time2");
    const item = await AppDS.manager.findOneBy(tables.index_block_time2, { block });
    return { block, time: item?.time ?? 0 };
  }
  const block = await getIndexConfig(indexBlockTimeV2NameBy(chain));
  const item = await AppDS.manager.findOneBy(tables.index_block_time_v2, { block });
  return { block, time: item?.time ?? 0 };
}
export async function getIndexedBlock(chain: number) {
  if (!SUPPORT_CHAINS.find((item) => item.id === chain)) throw new Error("Not supported chain");
  if (chain == story.id) {
    return getIndexConfig("index_block_time");
  }
  if (chain == sepolia.id) {
    return getIndexConfig("index_block_time2");
  }
  return getIndexConfig(indexBlockTimeV2NameBy(chain));
}

export async function getBlockTimeBy(chain: number, block: bigint) {
  if (!SUPPORT_CHAINS.find((item) => item.id === chain)) throw new Error("Not supported chain");
  if (chain == story.id) {
    const item = await AppDS.manager.findOneBy(tables.index_block_time, { block });
    return item?.time;
  }
  if (chain == sepolia.id) {
    const item = await AppDS.manager.findOneBy(tables.index_block_time2, { block });
    return item?.time;
  }
  const item = await AppDS.manager.findOneBy(tables.index_block_time_v2, { block });
  return item?.time;
}
export async function getBlockByTime(chain: number, time: number) {
  if (!SUPPORT_CHAINS.find((item) => item.id === chain)) throw new Error("Not supported chain");
  if (chain == story.id) {
    const item = await AppDS.manager.findOneBy(tables.index_block_time, { time: MoreThanOrEqual(time) });
    return item?.block;
  }
  if (chain == sepolia.id) {
    const item = await AppDS.manager.findOneBy(tables.index_block_time2, { time: MoreThanOrEqual(time) });
    return item?.block;
  }
  const item = await AppDS.manager.findOneBy(tables.index_block_time_v2, { time: MoreThanOrEqual(time) });
  return item?.block;
}
