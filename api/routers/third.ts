import { AppDS, tables } from "@/db";
import express from "express";
import type { Request, Response } from "express";
import { body, param } from "express-validator";
import { isAddress, type Address } from "viem";
import { CommonResponse } from "../common";
import { validate } from "../validator";
import { getIndexConfig } from "@/db/help";
import { indexEventName } from "@/schedule/index_events";
import { getPC } from "@/lib/publicClient";
import abiBVault from "@/configs/abiBVault";
import _ from "lodash";
import { MoreThanOrEqual } from "typeorm";
const r = express.Router();
export default r;

r.post(
  "/zealy",
  validate([
    body("accounts", "accounts error").custom(async (accounts) => {
      if (typeof accounts !== "object") {
        throw new Error("Accounts not object");
      }
      if (!accounts.wallet || typeof accounts.wallet !== "string" || !isAddress(accounts.wallet)) {
        throw new Error("Not find wallet address in accounts");
      }
    }),
  ]),
  async (req, res) => {
    const user = req.body["accounts"]["wallet"] as Address;
    const deposit = await AppDS.manager.findOne(tables.event_bvault_deposit, { where: { user } });
    const swap = await AppDS.manager.findOne(tables.event_bvault_swap, { where: { user } });
    if (Boolean(deposit) || Boolean(swap)) {
      const cr = CommonResponse.success("Quest completed");
      cr.message = "Quest completed";
      cr.send(res);
    } else {
      CommonResponse.badRequest("Validation failed").send(res);
    }
  }
);

const getBlockTime = async (block: bigint) => {
  const bt = await AppDS.manager.findOne(tables.index_block_time, { where: { block } });
  if (bt) {
    return bt.time;
  }
  const b = await getPC().getBlock({ blockNumber: block });
  return parseInt(b.timestamp.toString());
};

r.get("/checkyt/:account", validate([param("account").isEthereumAddress()]), async (req, res) => {
  const account = req.params["account"] as Address;
  const data = {
    status: 0,
    data: {
      timestamp: 0,
      tx: "",
    },
  };
  // const deposit = await AppDS.manager.findOne(tables.event_bvault_deposit, { where: { user: account } });
  const swap = await AppDS.manager.findOne(tables.event_bvault_swap, { where: { user: account } });
  if (Boolean(swap)) {
    data.status = 1;
    data.data.timestamp = await getBlockTime(swap!.block);
    data.data.tx = swap!.tx;
  }
  res.status(200).json(data);
});

async function queryPointsByBlock(req: Request, res: Response, bvault: Address, blockNumber: bigint) {
  try {
    const ec = await AppDS.manager.findOne(tables.index_event, { where: { address: bvault, table: "event_bvault_swap" } });
    if (!ec || blockNumber <= ec.start) {
      return res.status(404).send();
    }
    const indexBlockNumber = await getIndexConfig("index_block_time");
    const indexEventBlock = await getIndexConfig(indexEventName(ec));
    if (blockNumber > indexBlockNumber || blockNumber > indexEventBlock) {
      return res.status(500).json({ code: 120, message: "Need wait server index block" });
    }
    const blockTime = await getBlockTime(blockNumber);
    const pc = getPC(undefined, 1);
    const epochCount = await pc.readContract({ abi: abiBVault, address: bvault, functionName: "epochIdCount", blockNumber });
    if (epochCount == 0n) {
      return res.status(400).json({ code: 120, message: "Vault not start" });
    }
    const closed = await pc.readContract({ abi: abiBVault, address: bvault, functionName: "closed", blockNumber });
    if (closed) {
      return res.status(200).json({ data: [], timestamp: blockTime });
    }
    const users = await AppDS.getRepository(tables.event_bvault_swap)
      .createQueryBuilder()
      .select("user")
      .distinct(true)
      .where("address=:bvault AND epochId=:epochId AND block<=:block", { bvault, epochId: epochCount, block: blockNumber })
      .getRawMany();
    if (_.size(users) == 0) {
      return res.status(200).json({ data: [], timestamp: blockTime });
    }
    const [lpAmount, yTotal, vaultYbalance] = await Promise.all([
      pc.readContract({ abi: abiBVault, address: bvault, functionName: "assetBalance", blockNumber }),
      pc.readContract({ abi: abiBVault, address: bvault, functionName: "yTokenTotalSupply", args: [epochCount], blockNumber }),
      pc.readContract({ abi: abiBVault, address: bvault, functionName: "yTokenUserBalance", args: [epochCount, bvault], blockNumber }),
    ]);
    const yCirculAmount = yTotal - vaultYbalance;
    const data =
      yCirculAmount > 0n
        ? await Promise.all(
            users.map((item) =>
              pc
                .readContract({ abi: abiBVault, address: bvault, functionName: "yTokenUserBalance", args: [epochCount, item.user], blockNumber })
                .then((userYBalance) => ({ address: item.user, balance: ((lpAmount * userYBalance) / yCirculAmount).toString() }))
            )
          )
        : [];

    return res.status(200).json({ data: data, timestamp: blockTime });
  } catch (error) {
    console.error("ir_points_program:", req.params["bvault"], req.params["block"], error);
    return res.status(500).json({ code: 120, message: "Please retry a wait moment" });
  }
}

r.get(`/points/:bvault/:block`, validate([param("bvault").isEthereumAddress(), param("block").isNumeric()]), async (req, res) => {
  const bvault = req.params["bvault"] as Address;
  const blockNumber = BigInt(req.params["block"]);
  await queryPointsByBlock(req, res, bvault, blockNumber);
});

r.get(`/points/:bvault/timestamp/:timestamp`, validate([param("bvault").isEthereumAddress(), param("timestamp").isTime({ mode: "withSeconds" })]), async (req, res) => {
  try {
    
    const bvault = req.params["bvault"] as Address;
    const timestamp = parseInt(req.params["timestamp"]);
    const indexBlockNumber = await getIndexConfig("index_block_time");
    const blockTime = await getBlockTime(indexBlockNumber);
    if (blockTime < timestamp) return res.status(500).json({ code: 120, message: "Please retry a wait moment" });
    const item = await AppDS.manager.findOne(tables.index_block_time, { where: { time: MoreThanOrEqual(timestamp) } })
    if(!item) return res.status(500).json({ code: 120, message: "Please retry a wait moment" });
    await queryPointsByBlock(req, res, bvault, item.block);
  } catch (error) {
    return res.status(500).json({ code: 120, message: "Please retry a wait moment" })
  }
});
