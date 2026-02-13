import { getIndexConfig } from "@/db/help";
import { getPC } from "@/lib/publicClient";
import { bigintMin } from "@/lib/utils";

const minRange = 100n
export async function getIndexEventParams(chainId: number, name: string, defChunk: bigint = 10000n, defStart: bigint = 0n, cacheTime: number = 60000) {
  const pc = getPC(chainId);
  const start = (await getIndexConfig(name, defStart)) + 1n;
  const chunk = (await getIndexConfig(`event_block_chunk`, defChunk)) - 1n;
  if (chunk <= 0n) {
    return;
  }
  const blockNumber = await pc.getBlockNumber({ cacheTime });
  const end = bigintMin([start + chunk, blockNumber]);
  if (end <= start) {
    return;
  }
  if ((end - start) < (minRange - 1n)) return;
  return { start, end, blockNumber, pc };
}
