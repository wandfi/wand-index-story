import { abiBVault2, abiBvault2Query, abiHook } from "@/configs/abiBvault2";
import { BVAULT2_CONFIGS, type Bvault2Config } from "@/configs/bvaults2";
import { codeBvualt2Query } from "@/configs/codes";
import { INDEX_EVENTV2_CONFIGS } from "@/configs/indexEventsV2";
import { AppDS, tables } from "@/db";
import { getBlockByTime, getBlockTimeBy, getIndexConfig, getIndexedBlock } from "@/db/help";
import { getPC } from "@/lib/publicClient";
import { bigintMin, loopRun, promiseAll, toUtc0000UnixTime } from "@/lib/utils";
import { uniqBy } from "lodash";
import { erc20Abi, formatUnits, isAddressEqual, zeroAddress, type Address, type PublicClient } from "viem";
import { story } from "viem/chains";
import { indexEventV2Name } from "./index_events_v2";

export const ariaVaultBT = "0x3bb7dc96832f8f98b8aa2e9f2cc88a111f96a118" as Address;
export const ariaBTStart = 6745320n;
// next day time
async function nextTime() {
  const last = await AppDS.getRepository(tables.points_data_for_aria).createQueryBuilder().select("MAX(time)", "time").getRawOne<{ time: string }>();
  if (!last || !last.time) {
    let time = await getBlockTimeBy(story.id, ariaBTStart + 1n);
    console.info("nextTime:", ariaBTStart + 1n, time);
    if (!time) return undefined;
    time = toUtc0000UnixTime(time);
    return { block: ariaBTStart + 1n, time: time };
  }
  const time = toUtc0000UnixTime(Math.round(new Date(last.time).getTime() / 1000 + 25 * 60 * 60));
  const block = await getBlockByTime(story.id, time);
  console.info("nextTime:", last.time, block, time);
  if (!block) return undefined;
  return { block, time };
}

async function getUsersBy(block: bigint) {
  const users = await AppDS.getRepository(tables.eventV2_erc20_Transfer)
    .createQueryBuilder()
    .select(`"to"`, "user")
    .distinct(true)
    .where("block<=:block AND address=:address", { block, address: ariaVaultBT })
    .getRawMany<{ user: Address }>();
  const uniqUsers = uniqBy(users, (item) => item.user.toLowerCase());
  return uniqUsers;
}

async function getUserPoint(
  pc: PublicClient,
  bt: Address,
  btDecimals: number,
  vcs: Bvault2Config[],
  user: Address,
  blockNumber: bigint
): Promise<{ address: Address; balance: string } | null> {
  // skip zeroAddress
  if (user === zeroAddress) return null;
  const btBalance = await pc.readContract({ abi: erc20Abi, address: bt, functionName: "balanceOf", args: [user], blockNumber });
  // bt to point (1:1 bt:point)
  let point = btBalance;
  for (const vc of vcs) {
    if(blockNumber < vc.start) continue;
    const { hookBalance, epochCount, hookTotal, hookBT_PT } = await promiseAll({
      hookBalance: pc.readContract({ abi: erc20Abi, address: vc.hook, functionName: "balanceOf", args: [user], blockNumber }),
      hookTotal: pc.readContract({ abi: erc20Abi, address: vc.hook, functionName: "totalSupply", blockNumber }),
      hookBT_PT: pc.readContract({ abi: abiHook, address: vc.hook, functionName: "getReserves", blockNumber }),
      epochCount: pc.readContract({ abi: abiBVault2, address: vc.vault, functionName: "epochIdCount", blockNumber }),
    });
    if (epochCount > 0n) {
      const epoch = await pc.readContract({ abi: abiBVault2, address: vc.vault, functionName: "epochInfoById", args: [epochCount], blockNumber });
      if (!epoch.settledOnEnd) {
        const ytBalance = await pc.readContract({ abi: erc20Abi, address: epoch.YT, functionName: "balanceOf", args: [user], blockNumber });
        // yt convert to point (1:1 yt:point)
        if (ytBalance > 0n) {
          point += ytBalance;
        }
        // lp convert to point (lp split bt + yt)
        if (hookBalance > 0n) {
          const [bt, , ytOut] = await pc.readContract({
            abi: abiBvault2Query,
            code: codeBvualt2Query,
            functionName: "calcRemoveLP",
            args: [vc.vault, hookBalance],
            blockNumber,
          });
          point = point + ytOut + bt;
        }
      }
    } else if (hookBalance > 0n) {
      point += (hookBalance * hookBT_PT[0]) / hookTotal;
    }
  }
  if (point == 0n) return null;
  return { address: user, balance: formatUnits(point, btDecimals) };
}

async function updatePointData(vcs: Bvault2Config[], nt: { block: bigint; time: number }) {
  const users = await getUsersBy(nt.block);
  const pc = getPC(vcs[0].chain);
  const data = await Promise.all(users.map(({ user }) => getUserPoint(pc, ariaVaultBT, 18, vcs, user, nt.block)));
  const filterData = data.filter((item) => item !== null);
  AppDS.manager.transaction(async (ma) => {
    await ma.upsert(tables.points_data_for_aria, { time: nt.time, data: filterData }, ["time"]);
  });
}

async function getMinIndexedBlock() {
  const ie2cs = INDEX_EVENTV2_CONFIGS.filter((item) => isAddressEqual(item.address, ariaVaultBT));
  const blocks = await Promise.all([getIndexedBlock(story.id), ...ie2cs.map((ie) => getIndexConfig(indexEventV2Name(ie)))]);
  return bigintMin(blocks);
}

export default function indexPointsData() {
  loopRun("indexPointsDataForAria", async () => {
    const vcs = BVAULT2_CONFIGS.filter((item) => isAddressEqual(item.bt, ariaVaultBT));
    if (vcs.length == 0) return;
    const minIndexed = await getMinIndexedBlock();
    if (minIndexed == 0n || minIndexed <= ariaBTStart) return;
    const nt = await nextTime();
    if (!nt) return;
    console.info(`indexPointsDataForAria:doUpdatePoint`, minIndexed, nt);
    await updatePointData(vcs, nt);
  });
}
