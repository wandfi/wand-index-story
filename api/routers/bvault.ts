import { AppDS, tables } from "@/db";
import express from "express";
import { body, param } from "express-validator";
import { isAddressEqual, type Address } from "viem";
import { CommonResponse } from "../common";
import { validate } from "../validator";
import { In, LessThan, LessThanOrEqual, MoreThan } from "typeorm";
import { bigintMin, toMap } from "@/lib/utils";
import _ from "lodash";
import { InfraredVaultMapBVault } from "@/configs/infrared";
import { getIndexConfig } from "@/db/help";
import { indexEventName } from "@/schedule/index_events";
import { getPC } from "@/lib/publicClient";
import abiInfraredVault from "@/configs/abiInfraredVault";
import { iBGT } from "@/configs/network";
const r = express.Router();
export default r;

r.get("/getEpochYTPrices/:bvault/:epochId", validate([param("bvault").isEthereumAddress(), param("epochId").isNumeric()]), async (req, res) => {
  const bvault = req.params["bvault"] as Address;
  const epochId = BigInt(req.params["epochId"]);
  const datas = await AppDS.manager.find(tables.index_bvault_epoch_yt_price, { select: ["id", "price", "time"], where: { bvault, epochId } });
  CommonResponse.success(datas || []).send(res);
});

const getPtSynthetic = async (bvault: Address) => {
  const isV2 = Boolean(await AppDS.manager.findOne(tables.index_event, { where: { table: "event_bvault_epoch_started_v2", address: bvault } }));
  const epochCount = await AppDS.manager.count(isV2 ? tables.event_bvault_epoch_started_v2 : tables.event_bvault_epoch_started, { where: { address: bvault } });
  const data = await AppDS.manager.findOne(tables.index_bvault_epoch_pt_syntheticV2, { where: { bvault, epochId: BigInt(epochCount) } });
  return data?.value || 0n;
};

r.get("/getEpochPtSynthetic/:bvault", validate([param("bvault").isEthereumAddress()]), async (req, res) => {
  const bvault = req.params["bvault"] as Address;
  const ptsynthetic = await getPtSynthetic(bvault);
  CommonResponse.success(ptsynthetic).send(res);
});

r.post("/batchGetEpochPtSynthetic", async (req, res) => {
  let bvaults = req.body["bvaults"] as Address[];
  const map: { [k: Address]: bigint } = {};
  if (_.isEmpty(bvaults)) {
    const all = await AppDS.manager.find(tables.index_bvault_epoch_pt_syntheticV2, {});
    bvaults = _.chain(all)
      .map((item) => item.bvault)
      .union()
      .value();
  }
  await Promise.all(bvaults.map((bvault) => getPtSynthetic(bvault).then((value) => (map[bvault] = value))));
  CommonResponse.success(map).send(res);
});

r.get("/getDeposits/:bvault/:epochId", validate([param("bvault").isEthereumAddress(), param("epochId").isNumeric()]), async (req, res) => {
  const events = await AppDS.manager.find(tables.event_bvault_deposit, { where: { address: req.params["bvault"] as any, epochId: BigInt(req.params["epochId"]) } });
  const bTime = await AppDS.manager.find(tables.index_block_time, { where: { block: In(events.map((e) => e.block)) } });
  const bTimeMap = toMap(bTime || [], "block");
  const datas = events.map((e) => ({ ...e, blockTime: bTimeMap[e.block.toString()].time }));
  CommonResponse.success(datas).send(res);
});

r.get("/getYieldiBGT/:bvault", validate([param("bvault").isEthereumAddress()]), async (req, res) => {
  const bvault = req.params["bvault"] as Address;
  const ivault = _.keys(InfraredVaultMapBVault).find((ivault) => isAddressEqual(InfraredVaultMapBVault[ivault], bvault)) as Address;
  if (!ivault) return CommonResponse.badRequest("not find infrared vault by bvault");
  const indexBlock = await getIndexConfig("index_block_time", 0n);
  const indexEventRewardPaidBlock = await getIndexConfig(indexEventName({ address: ivault, table: "event_infrared_vault_RewardPaid" } as any), 0n);
  const minBlock = bigintMin([indexEventRewardPaidBlock, indexBlock]);
  if (minBlock == 0n) return CommonResponse.badRequest("please wait index_block_time");
  const firstDeposit = await AppDS.manager.findOne(tables.event_bvault_deposit, { where: { address: bvault } });
  if (!firstDeposit) return CommonResponse.badRequest("wait index bvault has deposit");
  const paids = await AppDS.manager.find(tables.event_infrared_vault_RewardPaid, {
    where: { address: ivault, reward: MoreThan(0n), block: LessThan(minBlock) },
    order: { block: "DESC" },
    take: 2,  
  });

  const earned = await getPC().readContract({ abi: abiInfraredVault, address: ivault, functionName: "earned", args: [bvault, iBGT], blockNumber: minBlock });
  let startBlock = firstDeposit.block;
  let endBlock = minBlock;
  let ibgtYield = earned;
  if (earned > 0n && paids.length) {
    startBlock = paids[0].block;
  } else if (earned == 0n && paids.length == 1) {
    endBlock = paids[0].block;
    ibgtYield = paids[0].reward;
  } else if (earned == 0n && paids.length == 2) {
    startBlock = paids[1].block;
    endBlock = paids[0].block;
    ibgtYield = paids[0].reward;
  }
  const [start, end] = await AppDS.manager.find(tables.index_block_time, { where: { block: In([startBlock, endBlock]) } });
  return CommonResponse.success({ yield: ibgtYield.toString(), dur: end.time - start.time }).send(res);
});
