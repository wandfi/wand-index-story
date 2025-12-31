import { AppDS, tables } from "@/db";
import express from "express";
import { param } from "express-validator";
import { LessThanOrEqual } from "typeorm";
import { validate } from "../validator";
const r = express.Router();
export default r;

// same to /aria/pointsByTimestamp/:timestamp
r.get(`/points/:bvault/timestamp/:timestamp`, validate([param("bvault").isEthereumAddress(), param("timestamp").isNumeric({ no_symbols: true })]), async (req, res) => {
  const timestamp = parseInt(req.params["timestamp"]);
  const item = await AppDS.manager.findOne(tables.points_data_for_aria, { where: { time: LessThanOrEqual(timestamp) }, order: { time: "DESC" } });
  if (!item || timestamp - item.time >= 3600 * 24) return res.status(500).json({ code: 120, message: "Please retry a wait moment" });
  return res.status(200).json({ data: item.data, timestamp: item.time });
});

r.get(`/aria/pointsByTimestamp/:timestamp`, validate([param("timestamp").isNumeric({ no_symbols: true })]), async (req, res) => {
  const timestamp = parseInt(req.params["timestamp"]);
  const item = await AppDS.manager.findOne(tables.points_data_for_aria, { where: { time: LessThanOrEqual(timestamp) }, order: { time: "DESC" } });
  if (!item || timestamp - item.time >= 3600 * 24) return res.status(500).json({ code: 120, message: "Please retry a wait moment" });
  return res.status(200).json({ data: item.data, timestamp: item.time });
});
