import abiBVault from "@/configs/abiBVault";
import { AppDS, event_bvault_epoch_started, index_bvault_epoch_yt_price, index_event, tables } from "@/db";
import { getIndexConfig, upIndexConfig } from "@/db/help";
import { getPC } from "@/lib/publicClient";
import { bigintMax, bigintMin, DECIMAL, loopRun, toMap } from "@/lib/utils";
import _ from "lodash";
import { In, LessThanOrEqual, MoreThanOrEqual, Raw } from "typeorm";
import type { Address, ContractFunctionExecutionError, PublicClient } from "viem";
import { indexEventName } from "./index_events";
import { getIndexEventParams } from "./utils";
const subAbi = abiBVault.filter((item) => item.name == "Y" || item.name == "yTokenUserBalance");
async function getBvaultEpochYTPrice(pc: PublicClient, vault: Address, epochId: bigint, block: bigint) {
  const [Y, vaultYTokenBalance] = await Promise.all([
    pc.readContract({ abi: subAbi, address: vault, functionName: "Y", blockNumber: block }).catch((e: ContractFunctionExecutionError) => {
      if ((e.message || '').includes("reverted")) {
        return 0n;
      } else {
        throw e;
      }
    }),
    pc.readContract({ abi: subAbi, address: vault, functionName: "yTokenUserBalance", args: [epochId, vault], blockNumber: block }),
  ]);
  return vaultYTokenBalance > 0n ? (Y * DECIMAL) / vaultYTokenBalance : 0n;
}

async function indexBvaultEpochYTPrice(name: string, ie: index_event) {
  const params = await getIndexEventParams(undefined,name, 12000n, ie.start);
  if (!params) return;
  const eventblock = await getIndexConfig(indexEventName(ie), 1n);
  const indexBlockTimeBlock = await getIndexConfig("index_block_time", 1n);
  params.end = bigintMin([eventblock, params.end, indexBlockTimeBlock]);
  if (params.start >= params.end) return;
  const [startIBT, endIBT] = await AppDS.manager.find(tables.index_block_time, { where: { block: In([params.start, params.end]) } });
  const startTime = BigInt(startIBT.time);
  const endTime = BigInt(endIBT.time);
  console.info("times: ", startTime, endTime);
  const ebesList = await AppDS.manager.find(tables.event_bvault_epoch_started, {
    where: {
      address: ie.address,
      startTime: LessThanOrEqual(endTime),
      duration: Raw(() => `duration > ${startTime} - startTime`),
    },
  });
  const chunkTime = 3600n; // 1 hours
  console.info("ebesList", ebesList);
  if (_.isEmpty(ebesList)) {
    await upIndexConfig(name, params.end);
  } else {
    const ebesDatas: { ebes: event_bvault_epoch_started; times: [number, bigint][] }[] = [];
    for (const item of ebesList) {
      const mStartTime = bigintMax([item.startTime, startTime]);
      const mEndTime = bigintMin([item.startTime + item.duration, endTime]);
      const startIndex = (mStartTime - item.startTime) / chunkTime;
      const endIndex = (mEndTime - item.startTime) / chunkTime;
      const times: [time: number, block: bigint][] = [];
      for (let index = startIndex; index <= endIndex; index++) {
        const time = index * chunkTime + item.startTime;
        const ibt = await AppDS.manager.findOne(tables.index_block_time, {
          where: { time: MoreThanOrEqual(parseInt(time.toString())) },
        });
        if (!ibt) throw "Not indexed block time";
        times.push([parseInt(time.toString()), BigInt(ibt.time) == time ? ibt.block : ibt.block - 1n]);
      }
      ebesDatas.push({ ebes: item, times });
    }
    const pc = getPC(undefined, 1);
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
      await upIndexConfig(name, params.end);
    });
  }
}
export default function indexBvaultSEpochYTprice() {
  const map: { [k: Address]: AbortController } = {};
  loopRun("start indexBvaultEpochYTprice for index event", async () => {
    const ies = (await AppDS.manager.find(tables.index_event, { where: { table: "event_bvault_epoch_started" } })) || [];
    // removed olds
    const iesmap = toMap(ies, "address");
    _.keys(map).forEach((key) => {
      if (!iesmap[key]) {
        map[key].abort();
        delete map[key];
      }
    });

    for (const ie of ies) {
      if (!map[ie.address] || map[ie.address].signal.aborted) {
        const ieTaskName = `index_bvault_epoch_yt_price_${ie.address}`;
        map[ie.address] = loopRun(ieTaskName, () => indexBvaultEpochYTPrice(ieTaskName, ie));
      }
    }
  });
}
