import { BVAULT2_CONFIGS } from "@/configs/bvaults2";
import { AppDS, tables } from "@/db";
import { getBlockByTime, getBlockTimeBy } from "@/db/help";
import { toUtc0000UnixTime } from "@/lib/utils";
import express from "express";
import { param } from "express-validator";
import { isAddressEqual, type Address } from "viem";
import { validate } from "../validator";
const r = express.Router();
export default r;

r.get(`/points/:bvault/:block`, validate([param("bvault").isEthereumAddress(), param("block").isNumeric({ no_symbols: true })]), async (req, res) => {
  const bvault = req.params["bvault"] as Address;
  const block = BigInt(req.params["block"]);
  const vc = BVAULT2_CONFIGS.find((vc) => isAddressEqual(vc.vault, bvault));
  if (!vc || block < vc.start) return res.status(400).json({ code: 400, message: "Please check request params" });
  const timestamp = await getBlockTimeBy(vc.chain, block);
  if(!timestamp) return res.status(500).json({ code: 120, message: "Please retry a wait moment" })
  const time = toUtc0000UnixTime(timestamp)

  const item = await AppDS.manager.findOne(tables.bvault_points_data, { where: { time: time } });
  if (!item) return res.status(500).json({ code: 120, message: "Please retry a wait moment" });
  return res.status(200).json({ data: item.data, timestamp: time });
});

r.get(`/points/:bvault/timestamp/:timestamp`, validate([param("bvault").isEthereumAddress(), param("timestamp").isNumeric({ no_symbols: true })]), async (req, res) => {
  const bvault = req.params["bvault"] as Address;
  const timestamp = parseInt(req.params["timestamp"]);
  const vc = BVAULT2_CONFIGS.find((vc) => isAddressEqual(vc.vault, bvault));
  if (!vc) return res.status(400).json({ code: 400, message: "Please check request params" });
  const time = toUtc0000UnixTime(timestamp);
  const block = await getBlockByTime(vc.chain, time);
  if (!block) return res.status(500).json({ code: 120, message: "Please retry a wait moment" });
  if (block < vc.start) return res.status(400).json({ code: 400, message: "Please check request params" });
  
  const item = await AppDS.manager.findOne(tables.bvault_points_data, { where: { time: time } });
  if (!item) return res.status(500).json({ code: 120, message: "Please retry a wait moment" });
  return res.status(200).json({ data: item.data, timestamp: time });
});
