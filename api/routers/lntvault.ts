import { AppDS, tables } from "@/db";
import express from "express";
import { body, param } from "express-validator";
import { type Address } from "viem";
import { CommonResponse } from "../common";
import { validate } from "../validator";
import { Raw } from "typeorm";
const r = express.Router();
export default r;

r.get("/getEpochYTPrices/:vault/:epochId", validate([param("vault").isEthereumAddress(), param("epochId").isNumeric()]), async (req, res) => {
  const vault = req.params["vault"] as Address;
  const epochId = BigInt(req.params["epochId"]);
  const datas = await AppDS.manager.find(tables.index_lntvault_epoch_yt_price, { select: ["id", "price", "time"], where: { vault, epochId } });
  CommonResponse.success(datas || []).send(res);
});

r.get("/:vault/:user/nftstat", validate([param("vault").isEthereumAddress(), param("user").isEthereumAddress()]), async (req, res) => {
  const vault = req.params["vault"] as Address;
  const user = req.params["user"] as Address;
  const items = await AppDS.manager.find(tables.index_lntvault_nftstat, { select: ["tokenId", "stat", "tx"], where: { vault, user, stat: Raw(() => "stat < 3") } });
  CommonResponse.success(items).send(res);
});
r.post("/batchNfts", validate([body("vaults").isArray()]), async (req, res) => {
  const vaults = req.body["vaults"] as Address[];
  const datas: { [k: Address]: number } = {};
  await Promise.all(
    vaults.map((vault) =>
      AppDS.manager.count(tables.index_lntvault_nftstat, { where: { vault, stat: Raw(() => "stat < 3") } }).then((count) => {
        datas[vault] = count;
      })
    )
  );
  CommonResponse.success(datas).send(res);
});
