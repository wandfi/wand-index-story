import { abiBVault2, abiBvault2Query, abiHook } from "@/configs/abiBvault2";
import { BVAULT2_CONFIGS, type Bvault2Config } from "@/configs/bvaults2";
import { INDEX_EVENTV2_CONFIGS } from "@/configs/indexEventsV2";
import { AppDS, tables } from "@/db";
import { getBlockByTime, getBlockTimeBy, getIndexConfig, getIndexedBlock } from "@/db/help";
import { getPC } from "@/lib/publicClient";
import { bigintMin, getErrorMsg, loopRun, promiseAll, toUtc0000UnixTime } from "@/lib/utils";
import { flatten, uniqBy } from "lodash";
import { erc20Abi, formatUnits, isAddressEqual, type Address, type PublicClient } from "viem";
import { indexEventV2Name } from "./index_events_v2";
import { codeBvualt2Query } from "@/configs/codes";

// next day time
async function nextTime(vc: Bvault2Config) {
  const last = await AppDS.getRepository(tables.bvault_points_data).createQueryBuilder().select("MAX(time)", "time").where({ vault: vc.vault }).getRawOne<{ time: string }>();
  //   const last = await AppDS.manager.findOne(tables.bvault_points_data, { where: { vault: vc.vault }, order: { time: "DESC" } });
  if (!last || !last.time) {
    let time = await getBlockTimeBy(vc.chain, vc.start + 1n);
    console.info("nextTime:", vc.start + 1n, time);
    if (!time) return undefined;
    time = toUtc0000UnixTime(time);
    return { block: vc.start + 1n, time: time };
  }
  const time = toUtc0000UnixTime(Math.round(new Date(last.time).getTime() / 1000 + 25 * 60 * 60));
  const block = await getBlockByTime(vc.chain, time);
  console.info("nextTime:", last.time, block, time);
  if (!block) return undefined;
  return { block, time };
}

async function getUsersBy(vc: Bvault2Config, block: bigint) {
  const users = await Promise.all([
    AppDS.getRepository(tables.eventV2_bvault2_LiquidityAdded)
      .createQueryBuilder()
      .select("user")
      .distinct(true)
      .where("block<=:block AND address=:address", { block, address: vc.market })
      .getRawMany<{ user: Address }>(),
    AppDS.getRepository(tables.eventV2_bvault2_SwapBTforPT)
      .createQueryBuilder()
      .select("user")
      .distinct(true)
      .where("block<=:block AND address=:address", { block, address: vc.vault })
      .getRawMany<{ user: Address }>(),
    AppDS.getRepository(tables.eventV2_bvault2_SwapBTforYT)
      .createQueryBuilder()
      .select("user")
      .distinct(true)
      .where("block<=:block AND address=:address", { block, address: vc.vault })
      .getRawMany<{ user: Address }>(),
    AppDS.getRepository(tables.eventV2_bvault2_MintPTandYT)
      .createQueryBuilder()
      .select("user")
      .distinct(true)
      .where("block<=:block AND address=:address", { block, address: vc.vault })
      .getRawMany<{ user: Address }>(),
  ]);
  const uniqUsers = uniqBy(flatten(users), (item) => item.user.toLowerCase());
  return uniqUsers;
}

async function getUserPoint(pc: PublicClient, vc: Bvault2Config, user: Address, blockNumber: bigint): Promise<{ address: Address; balance: string } | null> {
  const data = await promiseAll({
    btBalance: pc.readContract({ abi: erc20Abi, address: vc.bt, functionName: "balanceOf", args: [user], blockNumber }),
    hookBalance: pc.readContract({ abi: erc20Abi, address: vc.hook, functionName: "balanceOf", args: [user], blockNumber }),
    hookTotal: pc.readContract({ abi: erc20Abi, address: vc.hook, functionName: "totalSupply", blockNumber }),
    hookBT_PT: pc.readContract({ abi: abiHook, address: vc.hook, functionName: "getReserves", blockNumber }),
    epochCount: pc.readContract({ abi: abiBVault2, address: vc.vault, functionName: "epochIdCount", blockNumber }),
  });
  // bt to point (1:1 bt:point)
  let point = data.btBalance;
  if (data.epochCount > 0n) {
    const epoch = await pc.readContract({ abi: abiBVault2, address: vc.vault, functionName: "epochInfoById", args: [data.epochCount], blockNumber });
    if (!epoch.settledOnEnd) {
      const ytBalance = await pc.readContract({ abi: erc20Abi, address: epoch.YT, functionName: "balanceOf", args: [user], blockNumber });
      // yt convert to point (1:1 yt:point)
      if (ytBalance > 0n) {
        point += ytBalance;
      }
      // lp convert to point (lp split bt + yt)
      if (data.hookBalance > 0n) {
        const [bt, , ytOut] = await pc.readContract({
          abi: abiBvault2Query,
          code: codeBvualt2Query,
          functionName: "calcRemoveLP",
          args: [vc.vault, data.hookBalance],
          blockNumber,
        });
        point = point + ytOut + bt;
      }
    }
  } else if (data.hookBalance > 0n) {
    point += (data.hookBalance * data.hookBT_PT[0]) / data.hookTotal;
  }
  if (point == 0n) return null;
  return { address: user, balance: formatUnits(point, vc.decimals) };
}

async function updatePointData(vc: Bvault2Config, nt: { block: bigint; time: number }) {
  const users = await getUsersBy(vc, nt.block);
  const pc = getPC(vc.chain);
  const data = await Promise.all(users.map(({ user }) => getUserPoint(pc, vc, user, nt.block)));
  const filterData = data.filter((item) => item !== null);
  AppDS.manager.transaction(async (ma) => {
    await ma.upsert(tables.bvault_points_data, { vault: vc.vault, time: nt.time, data: filterData }, ["vault", "time"]);
  });
}

async function getMinIndexedBlock(vc: Bvault2Config) {
  const ie2cs = INDEX_EVENTV2_CONFIGS.filter((item) => isAddressEqual(item.address, vc.market) || isAddressEqual(item.address, vc.vault));
  const blocks = await Promise.all([getIndexedBlock(vc.chain), ...ie2cs.map((ie) => getIndexConfig(indexEventV2Name(ie)))]);
  return bigintMin(blocks);
}

export default function indexPointsData() {
  loopRun("indexPointsData", async () => {
    // const todayTime = toUtc0000UnixTime(Math.floor(now() / 1000));
    for (const vc of BVAULT2_CONFIGS) {
      try {
        const minIndexed = await getMinIndexedBlock(vc);
        if (minIndexed == 0n || minIndexed <= vc.start) continue;
        const nt = await nextTime(vc);
        if (!nt) continue;
        console.info(`indexPointsData:${vc.vault}:doUpdatePoint`, minIndexed, nt);
        await updatePointData(vc, nt);
      } catch (error) {
        console.error(`indexPointsData:${vc.vault}:error`, getErrorMsg(error));
        continue;
      }
    }
  });
}
