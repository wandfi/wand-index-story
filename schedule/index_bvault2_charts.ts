import { abiBVault2, abiBvault2Query } from "@/configs/abiBvault2";
import { BVAULT2_CONFIGS, type Bvault2Config } from "@/configs/bvaults2";
import { codeBvualt2Query } from "@/configs/codes";
import { AppDS, bvault2_charts, tables } from "@/db";
import { cacheGetBlocks1Hour, cacheGetTimeByBlock, getIndexConfig, upIndexConfig } from "@/db/help";
import { getPC } from "@/lib/publicClient";
import { bigintMin, bnLog, bnPow, bnToNumber, DECIMAL, loopRun, promiseAll } from "@/lib/utils";
// import { formatEther } from "viem";

async function getDatasBy(vc: Bvault2Config, blockNumber: bigint, time: number): Promise<Partial<bvault2_charts> | undefined> {
  const pc = getPC(vc.chain);
  const epochIdCount = await pc.readContract({ abi: abiBVault2, address: vc.vault, functionName: "epochIdCount", blockNumber });
  if (epochIdCount == 0n) return undefined;
  const { logs, epoch } = await promiseAll({
    logs: pc.readContract({ abi: abiBvault2Query, code: codeBvualt2Query, functionName: "getLog", args: [vc.vault], blockNumber }),
    epoch: pc.readContract({ abi: abiBVault2, address: vc.vault, functionName: "epochInfoById", args: [epochIdCount], blockNumber }),
  });
  // ptPrice
  const ptRate = logs.vPT + logs.BTtp > 0n ? (logs.vPT * DECIMAL) / (logs.vPT + logs.BTtp) : 0n;
  const btPricePT =
    logs.rateScalar > 0n && DECIMAL > ptRate ? (((DECIMAL * DECIMAL) / logs.rateScalar) * bnLog((ptRate * DECIMAL) / (DECIMAL - ptRate))) / DECIMAL + logs.rateAnchor : 0n;
  const ptPrice = btPricePT > 0n ? (DECIMAL * DECIMAL) / btPricePT : 0n;
  // console.info("getDatasBy:", formatEther(btPricePT), formatEther(ptRate), formatEther(ptPrice));
  // ptApy
  const YearSeconds = 365 * 24 * 60 * 60;
  const remain = bnToNumber(epoch.startTime + epoch.duration, 0) - time;
  const t = remain > 0 ? remain / YearSeconds : 0;
  const ptApy = bigintMin([btPricePT > 0 && t > 0 ? bnPow(btPricePT, 1 / t) - DECIMAL : 0n, BigInt(1e18) * 100000n]);
  // ytPrice
  const ytPrice = btPricePT > 0n ? ((btPricePT - DECIMAL) * DECIMAL) / btPricePT : 0n;
  // ytRoi
  const btPriceUsd = await vc.btPriceUsd(time);
  const underlingApy = await vc.underlingApy(time);
  const Pyt = (btPriceUsd * ytPrice) / DECIMAL;
  const Y = remain > 0 ? (underlingApy * BigInt(Math.round(remain))) / BigInt(YearSeconds) : 0n;
  const ytRoi = Pyt != 0n ? (Y * DECIMAL) / Pyt - DECIMAL : 0n;
  return { ptPrice, ptApy, ytPrice, ytRoi };
}
async function nextBlock(name: string, vc: Bvault2Config) {
  const last = await getIndexConfig(name);
  if (last == 0n) {
    const t = await cacheGetTimeByBlock(vc.chain, vc.start + 1n);
    if (!t) return undefined;
    return { block: vc.start + 1n, time: t };
  }
  const nBlock = last + (await cacheGetBlocks1Hour(vc.chain));
  const latestBlock = await getPC(vc.chain).getBlockNumber({ cacheTime: 3600 * 1000 });
  if (nBlock > latestBlock) return undefined;
  const nextTime = await cacheGetTimeByBlock(vc.chain, nBlock);
  return { block: nBlock, time: nextTime };
}
async function updateBvault2ChartData(name: string, vc: Bvault2Config) {
  const nb = await nextBlock(name, vc);
  if (!nb) return;
  const data = await getDatasBy(vc, nb.block, nb.time);
  // console.info(name, nb, data);
  await AppDS.manager.transaction(async (ma) => {
    if (data) {
      await ma.upsert(tables.bvault2_charts, { vault: vc.vault, time: nb.time, ...data }, ["vault", "time"]);
    }
    await upIndexConfig(name, nb.block, ma);
  });
}
export default function indexBvault2Charts() {
  for (const vc of BVAULT2_CONFIGS) {
    const TaskName = `index_bvault2_charts_${vc.vault}`;
    loopRun(TaskName, () => updateBvault2ChartData(TaskName, vc), 1000);
  }
}
