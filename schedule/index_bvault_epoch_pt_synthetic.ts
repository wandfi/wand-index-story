import { AppDS, event_bvault_deposit, index_bvault_epoch_pt_syntheticV2, index_event, tables } from "@/db";
import { getIndexConfig, upIndexConfig } from "@/db/help";
import { bigintMin, loopRun, toMap } from "@/lib/utils";
import _ from "lodash";
import { Raw } from "typeorm";
import { erc20Abi, type Address } from "viem";
import { indexEventName } from "./index_events";
import { getIndexEventParams } from "./utils";
import { getPC } from "@/lib/publicClient";
import abiBVault from "@/configs/abiBVault";
import { story } from "@/configs/network";

async function indexBvaultEpochPtSynthetic(name: string, ie: index_event, isV2?: boolean) {
  const params = await getIndexEventParams(story.id, name, 12000n, ie.start);
  if (!params) return;
  const indexDepositBlock = await getIndexConfig(indexEventName(ie), 1n);
  const indexTimeBlock = await getIndexConfig("index_block_time", 1n);
  const indexEpochStartBlock = await getIndexConfig(
    indexEventName({ table: isV2 ? "event_bvault_epoch_started_v2" : "event_bvault_epoch_started", address: ie.address } as any),
    1n
  );
  params.end = bigintMin([indexDepositBlock, indexTimeBlock, indexEpochStartBlock, params.end]);
  if (params.start >= params.end) return;
  const ebds = await AppDS.manager.find(tables.event_bvault_deposit, {
    where: {
      address: ie.address,
      block: Raw((alias) => `${alias} >= ${params.start} And ${alias} <= ${params.end}`),
    },
  });
  console.info(ie.address, "isV2:", isV2, "deposit:", params.start, "->", params.end, ebds);
  if (_.isEmpty(ebds)) {
    await upIndexConfig(name, params.end);
    return;
  }
  const groups: { [k: string]: event_bvault_deposit[] } = _.groupBy(ebds, (item) => item.epochId.toString());
  const datas: Partial<index_bvault_epoch_pt_syntheticV2>[] = [];
  for (const epochId of _.keys(groups)) {
    if (!groups[epochId]) {
      continue;
    }
    const table = isV2 ? tables.event_bvault_epoch_started_v2 : tables.event_bvault_epoch_started;
    const epoch = (await AppDS.manager.findOne(table, {
      where: { address: ie.address, epochId: BigInt(epochId) },
    }))!;
    console.info("epoch:", epoch);
    const getStartPTSynthetic = async () => {
      const pc = getPC(story.id, 1);
      const pToken = await pc.readContract({ abi: abiBVault, address: epoch.address, functionName: "pToken" });
      const startPTokenAmount = await pc.readContract({ abi: erc20Abi, address: pToken, functionName: "totalSupply", blockNumber: epoch.block });
      return startPTokenAmount * epoch.duration;
    };

    let sum = (await AppDS.manager.findOne(tables.index_bvault_epoch_pt_syntheticV2, { where: { bvault: ie.address, epochId: BigInt(epochId) } }))?.value || 0n;
    if (sum == 0n) {
      sum = await getStartPTSynthetic();
    }
    for (const item of groups[epochId]) {
      if (item.block == epoch.block) continue;
      const ibt = (await AppDS.manager.findOne(tables.index_block_time, { where: { block: item.block } }))!;
      sum += item.pTokenAmount * (epoch.startTime + epoch.duration - BigInt(ibt.time));
    }
    datas.push({ bvault: ie.address, epochId: BigInt(epochId), value: sum });
  }
  await AppDS.transaction(async (ma) => {
    await ma.upsert(tables.index_bvault_epoch_pt_syntheticV2, datas, ["bvault", "epochId"]);
    await upIndexConfig(name, params.end, ma);
  });
}
export default function indexBvaultSEpochPtSynthetic() {
  const map: { [k: Address]: AbortController } = {};
  loopRun("start indexBvaultSEpochPtSynthetic for index event", async () => {
    const ies = (await AppDS.manager.find(tables.index_event, { where: { table: "event_bvault_deposit" } })) || [];
    // removed olds
    const iesmap = toMap(ies, "address");
    _.keys(map).forEach((key) => {
      if (!iesmap[key]) {
        console.info("indexBvaultSEpochPtSynthetic", "stop removed task for:", key);
        map[key].abort();
        delete map[key];
      }
    });
    for (const ie of ies) {
      if (!map[ie.address] || map[ie.address].signal.aborted) {
        console.info("indexBvaultSEpochPtSynthetic", "start task for:", ie.address);
        const v2IndexEvent = await AppDS.manager.findOne(tables.index_event, { where: { table: "event_bvault_epoch_started_v2", address: ie.address } });
        const ieTaskName = `index_bvault_epoch_pt_syntheticV2_${ie.address}`;
        map[ie.address] = loopRun(ieTaskName, () => indexBvaultEpochPtSynthetic(ieTaskName, ie, Boolean(v2IndexEvent)));
      }
    }
  });
}
