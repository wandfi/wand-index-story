import { AppDS, event_lntvault_nft_base, index_event, index_lntvault_nftstat, tables } from "@/db";
import { getIndexConfig, upIndexConfig } from "@/db/help";
import { bigintMin, loopRun, toMap } from "@/lib/utils";
import _ from "lodash";
import { Raw } from "typeorm";
import type { QueryDeepPartialEntity } from "typeorm/query-builder/QueryPartialEntity.js";
import type { Address } from "viem";
import { indexEventName } from "./index_events";
import { getIndexEventParams } from "./utils";
import { sepolia } from "viem/chains";

async function indexLntVaultNftstatBy(name: string, ie: index_event) {
  const params = await getIndexEventParams(sepolia.id, name, 12000n, ie.start);
  if (!params) return;
  const needIndexEvents: (keyof typeof tables)[] = ["event_lntvault_NftDeposit", "event_lntvault_NftDepositClaimed", "event_lntvault_NftRedeem", "event_lntvault_NftRedeemClaimed"];
  for (const table of needIndexEvents) {
    const eventblock = await getIndexConfig(indexEventName({ table, address: ie.address } as any), 1n);
    params.end = bigintMin([eventblock, params.end]);
    if (params.start >= params.end) return;
  }
  // const nftAddress = await cacheGetNftAddress(ie.address);
  const block = Raw(() => `block >= ${params.start} AND block <= ${params.end}`);
  const deposited = await AppDS.manager.find(tables.event_lntvault_NftDeposit, { where: { address: ie.address, block } });
  const depositedClaimed = await AppDS.manager.find(tables.event_lntvault_NftDepositClaimed, { where: { address: ie.address, block } });
  const redeemed = await AppDS.manager.find(tables.event_lntvault_NftRedeem, { where: { address: ie.address, block } });
  const redeemedCalimed = await AppDS.manager.find(tables.event_lntvault_NftRedeemClaimed, { where: { address: ie.address, block } });
  const items: {
    [k: string]: event_lntvault_nft_base & { stat: index_lntvault_nftstat["stat"] };
  } = {};
  for (const item of deposited) {
    items[`${item.tokenId}`] = { ...item, stat: "Deposited" };
  }
  for (const item of depositedClaimed) {
    if (!items[`${item.tokenId}`] || item.block > items[`${item.tokenId}`].block) {
      items[`${item.tokenId}`] = { ...item, stat: "DepositedClaimed" };
    }
  }
  for (const item of redeemed) {
    if (!items[`${item.tokenId}`] || item.block > items[`${item.tokenId}`].block) {
      items[`${item.tokenId}`] = { ...item, stat: "Redeemed" };
    }
  }
  for (const item of redeemedCalimed) {
    if (!items[`${item.tokenId}`] || item.block > items[`${item.tokenId}`].block) {
      items[`${item.tokenId}`] = { ...item, stat: "RedeemedClaimed" };
    }
  }

  if (_.isEmpty(items)) {
    await upIndexConfig(name, params.end);
  } else {
    const datas = _.values(items).map<QueryDeepPartialEntity<index_lntvault_nftstat>>((item) => ({
      vault: ie.address,
      tokenId: item.tokenId,
      stat: item.stat,
      user: item.user,
      tx: item.tx,
    }));
    await AppDS.transaction(async (ma) => {
      await ma.upsert(tables.index_lntvault_nftstat, datas, ["vault", "tokenId"]);
      await upIndexConfig(name, params.end);
    });
  }
}
export default function indexLntVaultNftstat() {
  const map: { [k: Address]: AbortController } = {};
  loopRun("start indexLntVaultNftstat for index event", async () => {
    const ies = (await AppDS.manager.find(tables.index_event, { where: { table: "event_lntvault_NftDeposit" as keyof typeof tables } })) || [];
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
        const ieTaskName = `index_lntvault_nftstat_${ie.address}`;
        map[ie.address] = loopRun(ieTaskName, () => indexLntVaultNftstatBy(ieTaskName, ie));
      }
    }
  });
}
