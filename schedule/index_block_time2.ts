import { AppDS, tables } from "@/db";
import { upIndexConfig } from "@/db/help";
import { getPC } from "@/lib/publicClient";
import { loopRun } from "@/lib/utils";
import _ from "lodash";
import { getIndexEventParams } from "./utils";
import { sepolia } from "viem/chains";

export default function indexBlockTime2() {
  const name = "index_block_time2";
  loopRun(
    name,
    async () => {
      const params = await getIndexEventParams(sepolia.id,name, 10000n, 0n);
      console.info(name, params);
      if (!params||params.start == 1n) return;
      const pc = getPC(sepolia.id);
      const blockNums = _.range(parseInt(params.start.toString()), parseInt(params.end.toString()) + 1).map((num) => BigInt(num));
      const blocks = await Promise.all(blockNums.map((bn) => pc.getBlock({ blockNumber: bn })));
      await AppDS.manager.transaction(async (ma) => {
        await ma.insert(
          tables.index_block_time2,
          blocks.map((b) => ({ block: b.number, time: parseInt(b.timestamp.toString()) }))
        );
        await upIndexConfig(name, params.end, ma);
      });
    },
    1000
  );
}
