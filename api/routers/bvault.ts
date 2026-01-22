import { BVAULT2_CONFIGS } from "@/configs/bvaults2";
import { AppDS, tables } from "@/db";
import express from "express";
import { param } from "express-validator";
import _ from "lodash";
import { Between } from "typeorm";
import { isAddressEqual, type Address } from "viem";
import { CommonResponse } from "../common";
import { validate } from "../validator";
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


r.get(
  "/charts-data/:vault/:start/:end",
  validate([param("vault").isEthereumAddress(), param("start").isNumeric({ no_symbols: true }), param("end").isNumeric({ no_symbols: true })]),
  async (req, res) => {
    const start = parseInt(req.params["start"]);
    const end = parseInt(req.params["end"]);
    const vault = req.params["vault"] as Address;
    const vc = BVAULT2_CONFIGS.find((vc) => isAddressEqual(vc.vault, vault));
    let data: any = [];
    if (vc) {
      data = await AppDS.manager.findBy(tables.bvault2_charts, { vault: vault, time: Between(start, end) });
    }
    CommonResponse.success(data).send(res);
  }
);


r.get("/info/:bvault", validate([param("bvault").isEthereumAddress()]), async (req, res) => {
  const bvault = req.params["bvault"] as Address;
  const repoDeposit = AppDS.getRepository(tables.event_bvault_deposit);
  const repoSwap = AppDS.getRepository(tables.event_bvault_swap);
  const data = await AppDS.query<{ name: string; count: number }[]>(`
      Select 'depositCount' as name, Count(*) as count from ${repoDeposit.metadata.tableName} where address='${bvault}'
	      UNION ALL
      Select 'swapCount' as name, Count(*) as count from ${repoSwap.metadata.tableName} where address='${bvault}'
        UNION ALL
      Select 'ytHolders' as name, Count(Distinct user) as count from ${repoSwap.metadata.tableName} where address='${bvault}'  
    `);
  const info: any = {};
  for (const item of data) {
    info[item.name] = item.count;
  }
  CommonResponse.success(info).send(res);
});
