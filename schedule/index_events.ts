import { InfraredVaultMapBVault } from "@/configs/infrared";
import { story } from "@/configs/network";
import { AppDS, index_event, tables } from "@/db";
import { upIndexConfig } from "@/db/help";
import { getPC } from "@/lib/publicClient";
import { loopRun, toMap } from "@/lib/utils";
import _ from "lodash";
import { isAddressEqual, parseAbiItem, parseEventLogs, type AbiEvent } from "viem";
import { getIndexEventParams } from "./utils";

export function indexEventName(ec: index_event) {
  return `event_${ec.table}_current_${ec.address}`;
}
async function fetchEvent(ec: index_event) {
  // console.info('ec:', ec)
  const isLnt = ec.table.includes("lntvault") || ec.table === "event_erc721_transfer";
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
  // for table groups
  const map: { [k: string]: index_event[] } = {};
  // addTo map
  loopRun(`update_map_by_index_event`, async () => {
    const event_configs = await AppDS.manager.find(index_event);
    const event_configs_map = toMap(event_configs || [], "id");
    // remove olds
    _.keys(map).forEach((key) => {
      map[key] = (map[key] || []).filter((e) => !!event_configs_map[e.id]);
    });

    // add news
    event_configs.forEach((e) => {
      if (!map[e.table]) {
        map[e.table] = [e];
      } else {
        const find = map[e.table].find((item) => item.id == e.id);
        if (!find) {
          map[e.table] = [...map[e.table], e];
        }
      }
    });
  });
  // loop task map
  const tasks: { [k: string]: AbortController } = {};
  loopRun(`start_index_task_for_map`, async () => {
    for (const table of _.keys(map)) {
      const ac = tasks[table];
      if (!ac || ac.signal.aborted) {
        // start task
        tasks[table] = loopRun(`fetchEvent_${table}`, async () => {
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
  });
}
