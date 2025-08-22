import { getIndexConfig } from "@/db/help";
import { getPC } from "@/lib/publicClient";
import { bigintMin } from "@/lib/utils";


export async function getIndexEventParams(chainId: number, name: string, defChunk: bigint = 10000n, defStart: bigint = 0n) {
  const pc = getPC(chainId);
  const start = (await getIndexConfig(name, defStart)) + 1n;
  const chunk = (await getIndexConfig(`event_block_chunk`, defChunk)) - 1n;
  if (chunk <= 0n) {
    return;
  }
  const blockNumber = await pc.getBlockNumber({ cacheTime: 5000 });
  const end = bigintMin([start + chunk, blockNumber]);
  if (end <= start) {
    return;
  }
  return { start, end, blockNumber, pc };
}
