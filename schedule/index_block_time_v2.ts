import { AppDS, tables } from "@/db";
import { upIndexConfig } from "@/db/help";
import { loopRun } from "@/lib/utils";
import _ from "lodash";
import { getIndexEventParams } from "./utils";
import { getPC } from "@/lib/publicClient";
export type IndexChainTimeConfig = {
  chain: number;
  start: bigint;
};
const needIndexChains: IndexChainTimeConfig[] = [];

export function indexBlockTimeV2Name(ic: IndexChainTimeConfig) {
  return `index_block_time_v2_${ic.chain}`;
}
export function indexBlockTimeV2NameBy(chain: number){
  const nic = needIndexChains.find(item => item.chain == chain)
  if(!nic) throw new Error("Not supported chain")
  return indexBlockTimeV2Name(nic)  
}
export default function indexBlockTimeV2() {
  if (needIndexChains.length == 0) return;
  loopRun(
    "index_block_time_v2",
    async () => {
      for (const ic of needIndexChains) {
        const name = indexBlockTimeV2Name(ic);
        const params = await getIndexEventParams(ic.chain, name, 50n, ic.start);
        if (!params || params.start == 1n) return;
        const pc = getPC(ic.chain, 0);
        const blockNums = _.range(parseInt(params.start.toString()), parseInt(params.end.toString()) + 1).map((num) => BigInt(num));
        const blocks = await Promise.all(blockNums.map((bn) => pc.getBlock({ blockNumber: bn })));
        await AppDS.manager.transaction(async (ma) => {
          await ma.insert(
            tables.index_block_time_v2,
            blocks.map((b) => ({ chain: ic.chain, block: b.number, time: parseInt(b.timestamp.toString()) }))
          );
          await upIndexConfig(name, params.end, ma);
        });
      }
    },
    1000
  );
}
