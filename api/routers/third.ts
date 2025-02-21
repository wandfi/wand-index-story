import { AppDS, tables } from "@/db";
import express from "express";
import { body } from "express-validator";
import { isAddress, type Address } from "viem";
import { CommonResponse } from "../common";
import { validate } from "../validator";
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
