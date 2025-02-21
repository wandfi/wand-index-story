import { AppDS, tables } from "@/db";
import express from "express";
import { body, param } from "express-validator";
import { type Address } from "viem";
import { CommonResponse } from "../common";
import { validate } from "../validator";
const r = express.Router();
export default r;

r.get("/:token/:user/tokenIds", validate([param("token").isEthereumAddress(), param("user").isEthereumAddress()]), async (req, res) => {
  const token = req.params["token"] as Address;
  const user = req.params["user"] as Address;
  const datas = await AppDS.manager.find(tables.index_erc721_owner, { select: ["tokenId"], where: { token: token, owner: user } });
  const ids = (datas || []).map((item) => item.tokenId);
  CommonResponse.success(ids).send(res);
});
r.post("/:user/tokenIds", validate([param("user").isEthereumAddress(), body("tokens").isArray()]), async (req, res) => {
  const tokens = req.body["tokens"] as Address[];
  const user = req.params["user"] as Address;
  const datas: { [k: Address]: bigint[] } = {};
  for (const token of tokens) {
    const tokendatas = await AppDS.manager.find(tables.index_erc721_owner, { select: ["tokenId"], where: { token: token, owner: user } });
    const ids = (tokendatas || []).map((item) => item.tokenId);
    datas[token] = ids;
  }
  CommonResponse.success(datas).send(res);
});
