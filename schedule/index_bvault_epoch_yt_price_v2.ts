import abiBVault from "@/configs/abiBVault";
import { story } from "@/configs/network";
import { AppDS, event_bvault_epoch_started_v2, index_bvault_epoch_yt_price, index_event, tables } from "@/db";
import { cacheGetBlocks1Hour, cacheGetTimeByBlock, getIndexConfig, upIndexConfig } from "@/db/help";
import { getPC } from "@/lib/publicClient";
import { bigintMax, bigintMin, DECIMAL, loopRun } from "@/lib/utils";
import _ from "lodash";
import { LessThanOrEqual, Raw } from "typeorm";
import type { Address, ContractFunctionExecutionError, PublicClient } from "viem";
import { indexEventName } from "./index_events";
import { getIndexEventParams } from "./utils";
const subAbi = abiBVault.filter((item) => item.name == "Y" || item.name == "yTokenUserBalance");
async function getBvaultEpochYTPrice(pc: PublicClient, vault: Address, epochId: bigint, block: bigint) {
  const [Y, vaultYTokenBalance] = await Promise.all([
    pc
      .readContract({ abi: subAbi, address: vault, functionName: "Y", blockNumber: block })
      .catch((e: ContractFunctionExecutionError) => {
        if ((e.message || "").includes("reverted")) {
          return 0n;
        } else {
          throw e;
        }
      })
      .catch((e) => e.message.includes("")),
    pc.readContract({ abi: subAbi, address: vault, functionName: "yTokenUserBalance", args: [epochId, vault], blockNumber: block }),
  ]);
  return vaultYTokenBalance > 0n ? (Y * DECIMAL) / vaultYTokenBalance : 0n;
}

async function indexBvaultEpochYTPrice(name: string, ie: index_event) {
  const params = await getIndexEventParams(ie.chain ?? story.id, name, 12000n, ie.start);
  if (!params) return;
  const eventblock = await getIndexConfig(indexEventName(ie), 1n);
  params.end = bigintMin([eventblock, params.end]);
  if (params.start >= params.end) return;

  const startIBT = await cacheGetTimeByBlock(ie.chain ?? story.id, params.start);
  // const endIBT = await cacheGetTimeByBlock(berachain.id, params.end)
  const startTime = BigInt(startIBT);
  console.info("times: ", startTime, ie.address);
  const ebesList = await AppDS.manager.find(tables.event_bvault_epoch_started_v2, {
    where: {
      address: ie.address,
      block: LessThanOrEqual(params.end),
      duration: Raw(() => `duration > ${startTime} - startTime`),
    },
  });
  const chunkBlock = await cacheGetBlocks1Hour(ie.chain ?? story.id); // 1 hours
  console.info("ebesList", ebesList);
  if (_.isEmpty(ebesList)) {
    await upIndexConfig(name, params.end);
  } else {
    const ebesDatas: { ebes: event_bvault_epoch_started_v2; times: [number, bigint][] }[] = [];
    for (const item of ebesList) {
      const mStart = bigintMax([item.block, params.start]);
      const mEnd = bigintMin([(item.duration / 3600n) * chunkBlock + item.block, params.end]);
      // const mStartTime = bigintMax([item.startTime, startTime]);
      // const mEndTime = bigintMin([item.startTime + item.duration, endTime]);
      const startIndex = (mStart - item.block) / chunkBlock;
      const endIndex = (mEnd - item.block) / chunkBlock;
      const times: [time: number, block: bigint][] = [];
      for (let index = startIndex; index <= endIndex; index++) {
        const block = index * chunkBlock + item.block;
        const time = await cacheGetTimeByBlock(ie.chain ?? story.id, block);
        times.push([time, block]);
      }
      ebesDatas.push({ ebes: item, times });
    }
    const pc = getPC(ie.chain ?? story.id, 1);
    const ytPricesItem = (
      await Promise.all(
        ebesDatas.map((item) =>
          Promise.all(
            item.times.map(([time, block]) =>
              getBvaultEpochYTPrice(pc, item.ebes.address, item.ebes.epochId, block).then<Omit<index_bvault_epoch_yt_price, "id">>((price) => ({
                bvault: item.ebes.address,
                epochId: item.ebes.epochId,
                time,
                price,
              }))
            )
          )
        )
      )
    ).flat();
    console.info("ytPricesItem", ytPricesItem);
    await AppDS.transaction(async (ma) => {
      await ma.upsert(tables.index_bvault_epoch_yt_price, ytPricesItem, ["bvault", "epochId", "time"]);
      await upIndexConfig(name, params.end, ma);
    });
  }
}
export default function indexBvaultSEpochYTprice() {
  loopRun("start indexBvaultEpochYTprice for index event", async () => {
    const ies = (await AppDS.manager.find(tables.index_event, { where: { table: "event_bvault_epoch_started_v2" } })) || [];
    for (const ie of ies) {
      const ieTaskName = `index_bvault_epoch_yt_price_${ie.address}`;
      indexBvaultEpochYTPrice(ieTaskName, ie).catch(e => {
        console.error(ieTaskName, e.message)
      })
    }
  });
}
