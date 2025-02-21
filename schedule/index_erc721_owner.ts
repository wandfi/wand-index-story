import { AppDS, index_event, tables } from "@/db";
import { getIndexConfig, upIndexConfig } from "@/db/help";
import { bigintMin, loopRun, toMap } from "@/lib/utils";
import _ from "lodash";
import { And, LessThanOrEqual, MoreThanOrEqual, Raw } from "typeorm";
import type { Address } from "viem";
import { indexEventName } from "./index_events";
import { getIndexEventParams } from "./utils";
import { sepolia } from "viem/chains";

async function indexErc721OwnerBy(name: string, ie: index_event) {
  const params = await getIndexEventParams(sepolia.id,name, 12000n, ie.start);
  if (!params) return;
  const eventblock = await getIndexConfig(indexEventName(ie), 1n);
  params.end = bigintMin([eventblock, params.end]);
  if (params.start >= params.end) return;

  const trans = await AppDS.manager.find(tables.event_erc721_transfer, {
    where: {
      address: ie.address,
      block: Raw(() => `block >= ${params.start} AND block <= ${params.end}`),
    },
  });
  if (_.isEmpty(trans)) {
    await upIndexConfig(name, params.end);
  } else {
    const items = trans.map((item) => ({ token: item.address, tokenId: item.tokenId, owner: item.to }));
    await AppDS.transaction(async (ma) => {
      await ma.upsert(tables.index_erc721_owner, items, ["token", "tokenId"]);
      await upIndexConfig(name, params.end);
    });
  }
}
export default function indexErc721Owner() {
  const map: { [k: Address]: AbortController } = {};
  loopRun("start indexErc721Owner for index event", async () => {
    const ies = (await AppDS.manager.find(tables.index_event, { where: { table: "event_erc721_transfer" as keyof typeof tables } })) || [];
    // removed olds
    const iesmap = toMap(ies, "address");
    _.keys(map).forEach((key) => {
      if (!iesmap[key]) {
        map[key].abort();
        delete map[key];
      }
    });

    for (const ie of ies) {
      if (!map[ie.address] || map[ie.address].signal.aborted) {
        const ieTaskName = `index_erc721_${ie.address}`;
        map[ie.address] = loopRun(ieTaskName, () => indexErc721OwnerBy(ieTaskName, ie));
      }
    }
  });
}
