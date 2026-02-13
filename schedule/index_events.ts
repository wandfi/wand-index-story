import { InfraredVaultMapBVault } from "@/configs/infrared";
import { story } from "@/configs/network";
import { AppDS, index_event, tables } from "@/db";
import { upIndexConfig } from "@/db/help";
import { getPC } from "@/lib/publicClient";
import { loopRun } from "@/lib/utils";
import _, { groupBy, keys } from "lodash";
import { isAddressEqual, parseAbiItem, parseEventLogs, type AbiEvent } from "viem";
import { getIndexEventParams } from "./utils";

export function indexEventName(ec: index_event) {
  return `event_${ec.table}_current_${ec.address}`;
}
async function fetchEvent(ec: index_event) {
  // console.info('ec:', ec)
  const indexCurrentName = indexEventName(ec);
  const params = await getIndexEventParams(story.id, indexCurrentName, 10000n, ec.start);
  const table = tables[ec.table];
  if (!params || !table) return;
  const { start, end } = params;
  const eventAbi: AbiEvent = parseAbiItem(ec.event) as any;
  console.info(indexCurrentName, start, end);
  const pc = getPC(story.id);
  const logs = await pc.getLogs({
    address: ec.address,
    event: eventAbi,
    fromBlock: start,
    toBlock: end,
  });
  const events = parseEventLogs({ abi: [eventAbi], logs }).filter((e) => {
    if (ec.table == "event_infrared_vault_RewardPaid" && InfraredVaultMapBVault[ec.address]) {
      return isAddressEqual(InfraredVaultMapBVault[ec.address], (e.args as any).user);
    } else {
      return true;
    }
  });
  const models = events.map((e) => ({
    block: e.blockNumber,
    address: ec.address,
    tx: e.transactionHash,
    ...(e as any).args,
  }));
  await AppDS.manager.transaction("READ COMMITTED", async (ma) => {
    if (models.length > 0) {
      await ma.insert(table, models);
    }
    await upIndexConfig(indexCurrentName, end, ma);
  });
}

export default function indexEvents() {
  // addTo map
  loopRun(`index_events`, async () => {
    const event_configs = await AppDS.manager.find(index_event);
    const groups = groupBy(event_configs, ec => ec.table)
    for (const table of keys(groups)) {
      runIndexEvents(groups[table] || []).catch((e) => {
        console.error(`index_events_for_${table}`, e.message)
      });
    }
  });
}
async function runIndexEvents(ies: index_event[]) {
  const configs = _.shuffle(ies);
  for (const conf of configs) {
    await fetchEvent(conf);
  }
}

