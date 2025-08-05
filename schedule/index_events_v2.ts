import { INDEX_EVENTV2_CONFIGS, type IndexEventV2Config } from "@/configs/indexEventsV2";
import { AppDS, tables } from "@/db";
import { upIndexConfig } from "@/db/help";
import { loopRun } from "@/lib/utils";
import _, { groupBy } from "lodash";
import { parseAbiItem, parseEventLogs, type AbiEvent } from "viem";
import { getIndexEventParams } from "./utils";

export function indexEventV2Name(ec: IndexEventV2Config) {
  return `event_v2_${ec.chain}_${ec.table}_${ec.address}`;
}
async function fetchEvent(ec: IndexEventV2Config) {
  // console.info('ec:', ec)
  const indexCurrentName = indexEventV2Name(ec);
  const params = await getIndexEventParams(ec.chain, indexCurrentName, 5000n, ec.start);
  const table = tables[ec.table];
  if (!params || !table) return;
  const { start, end } = params;
  const eventAbi: AbiEvent = parseAbiItem(ec.event) as any;
  console.info(indexCurrentName, start, end);
  const pc = params.pc;
  const logs = await pc.getLogs({
    address: ec.address,
    event: eventAbi,
    fromBlock: start,
    toBlock: end,
  });
  const events = parseEventLogs({ logs, abi: [eventAbi], eventName: eventAbi.name });
  const models = events.map((e) => ({
    block: e.blockNumber,
    address: ec.address,
    tx: e.transactionHash,
    chain: ec.chain,
    ...(e as any).args,
  }));
  await AppDS.manager.transaction("READ COMMITTED", async (ma) => {
    if (models.length > 0) {
      await ma.insert(table, models);
    }
    await upIndexConfig(indexCurrentName, end, ma);
  });
}

export default function indexEventsV2() {
  // for table groups
  const map = groupBy(INDEX_EVENTV2_CONFIGS, (ec) => ec.table);
  // loop task map
  const tasks: { [k: string]: AbortController } = {};
  for (const table of _.keys(map)) {
    const ac = tasks[table];
    if (!ac || ac.signal.aborted) {
      // start task
      tasks[table] = loopRun(`fetchEventV2_${table}`, async () => {
        const configs = _.shuffle(map[table] || []);
        for (const conf of configs) {
          await fetchEvent(conf);
        }
      });
    } else if (_.isEmpty(map[table])) {
      // cancel task
      ac.abort();
      delete tasks[table];
    }
  }
}
