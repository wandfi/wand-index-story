import { CONFIGS } from "@/configs";
import { InfraredVaultMapBVault } from "@/configs/infrared";
import { AppDS, tables } from "@/db";
import { upIndexConfig } from "@/db/help";
import express from "express";
import { body, header, param } from "express-validator";
import _ from "lodash";
import { Like } from "typeorm";
import { isAddressEqual, parseAbiItem, recoverMessageAddress, type Address } from "viem";
import { CommonResponse } from "../common";
import { validate } from "../validator";
const r = express.Router();
export default r;
r.use(validate([header("authorization").isBase64().notEmpty()]), async (req, res, next) => {
  try {
    const auth = atob(req.headers.authorization!);
    const address = await recoverMessageAddress({ message: "Auth for zoofi", signature: auth as any });
    if (address == CONFIGS.admin) {
      return next();
    }
    const user = await AppDS.manager.findOne(tables.users, { where: { name: address, role: "admin" } });
    if (user) {
      return next();
    } else {
      CommonResponse.unauthorized("Auth error").send(res);
    }
  } catch (error) {
    CommonResponse.unauthorized("Auth error").send(res);
  }
});

r.post("/setUser", validate([body("name").isEthereumAddress(), body("role").isString().isIn(["admin"])]), async (req, res) => {
  await AppDS.manager.upsert(tables.users, { name: req.body.name, role: req.body.role }, ["name"]);
  CommonResponse.success().send(res);
});

r.post(
  "/addIndexEvent",
  validate([
    body("address", "Address Error").isEthereumAddress(),
    body("event", "Event Error")
      .isString()
      .custom((input: string) => {
        if (parseAbiItem(input).type !== "event") {
          throw new Error("event not valid");
        }
        return true;
      }),
    body("table", "Table Error")
      .isString()
      .custom((input: string) => {
        if (!input.startsWith("event_") || !tables[input]) {
          throw new Error("table not existed");
        }
        return true;
      }),
    body("start", "Start Error").isNumeric({ no_symbols: true }),
  ]),
  async (req, res) => {
    // AppDS.manager.upsert()
    await AppDS.manager.upsert(
      tables.index_event,
      {
        address: req.body.address,
        event: req.body.event,
        table: req.body.table,
        start: BigInt(req.body.start),
      },
      ["address", "table"]
    );
    CommonResponse.success().send(res);
  }
);

const needEventsOld: { table: keyof typeof tables; event: string }[] = [
  { table: "event_bvault_epoch_started", event: "event EpochStarted(uint256 epochId, uint256 startTime, uint256 duration, address redeemPool)" },
  { table: "event_bvault_deposit", event: "event Deposit(uint256 indexed epochId, address indexed user, uint256 assetAmount, uint256 pTokenAmount, uint256 yTokenAmount)" },
];
const needEvents: { table: keyof typeof tables; event: string }[] = [
  {
    table: "event_bvault_epoch_started_v2",
    event: "event EpochStarted(uint256 epochId, uint256 startTime, uint256 duration, address redeemPool, address stakingBribesPool, address adhocBribesPool)",
  },
  { table: "event_bvault_deposit", event: "event Deposit(uint256 indexed epochId, address indexed user, uint256 assetAmount, uint256 pTokenAmount, uint256 yTokenAmount)" },
  { table: "event_bvault_swap", event: "event Swap(uint256 indexed epochId, address indexed user, uint256 assetAmount, uint256 fees, uint256 pTokenAmount, uint256 yTokenAmount)" },
];

r.post("/addIndexBVault/:bvault/:createAt", validate([param("bvault").isEthereumAddress(), param("createAt").isNumeric({ no_symbols: true })]), async (req, res) => {
  const events = needEventsOld.map((item) => ({ address: req.params["bvault"] as Address, ...item, start: BigInt(req.params["createAt"]) }));
  await AppDS.manager.upsert(tables.index_event, events, ["address", "table"]);
  CommonResponse.success().send(res);
});


r.post("/delIndexLntVault/:vault", validate([param("vault").isEthereumAddress()]), async (req, res) => {
  const vault = req.params["vault"] as Address;
  await AppDS.manager.delete(tables.index_event, { address: vault });
  CommonResponse.success().send(res);
});

r.post("/addIndexBVaultV2/:bvault/:createAt", validate([param("bvault").isEthereumAddress(), param("createAt").isNumeric({ no_symbols: true })]), async (req, res) => {
  const events = needEvents.map((item) => ({ address: req.params["bvault"] as Address, ...item, start: BigInt(req.params["createAt"]) }));
  const ivault = _.keys(InfraredVaultMapBVault).find((ivault) => isAddressEqual(InfraredVaultMapBVault[ivault], req.params["bvault"] as any)) as Address;
  if (ivault) {
    events.push({
      address: ivault,
      table: "event_infrared_vault_RewardPaid",
      event: "event RewardPaid(address indexed user, address indexed rewardsToken, uint256 reward)",
      start: BigInt(req.params["createAt"]),
    });
  }
  await AppDS.manager.upsert(tables.index_event, events, ["address", "table"]);
  CommonResponse.success().send(res);
});

r.post("/delIndexBVault/:bvault", validate([param("bvault").isEthereumAddress()]), async (req, res) => {
  await AppDS.manager.delete(tables.index_event, { address: req.params["bvault"] as Address });
  CommonResponse.success().send(res);
});

r.get("/getIndexEvents", async (req, res) => {
  const datas = await AppDS.manager.find(tables.index_event);
  CommonResponse.success(datas || []).send(res);
});
r.get("/getIndexEvents/:table", async (req, res) => {
  const table = req.params.table;
  const datas = await AppDS.manager.find(tables.index_event, { where: table ? { table: Like(`%${table}%`) } : {} });
  CommonResponse.success(datas || []).send(res);
});

r.get("/getIndexConfig/:name", async (req, res) => {
  const name = req.params.name;
  // console.info('name:', name)
  const datas = await AppDS.manager.find(tables.index_config, { where: name ? { name: Like(`%${name}%`) } : {} });
  CommonResponse.success(datas || []).send(res);
});

r.post("/setIndexConfig", validate([body("name").isString(), body("value").isNumeric()]), async (req, res) => {
  await upIndexConfig(req.body.name, BigInt(req.body.value));
  CommonResponse.success().send(res);
});
