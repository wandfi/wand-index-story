import { apiBatchConfig, getCurrentChainId, multicallBatchConfig, SUPPORT_CHAINS } from "@/configs/network";
import _, { flatten, isNumber, keys, random } from "lodash";
import { createPublicClient, http, type Chain, type PublicClient } from "viem";

const pcMaps: { [id: number]: { pcs: PublicClient[]; current: number } } = {};

function getRpcurls(chain: Chain) {
  const names = keys(chain.rpcUrls);
  return flatten(
    names.map((item) => {
      const rpcItem = chain.rpcUrls[item];
      const data: { name: string; type: "http" | "webSocket"; url: string }[] = [];
      const http = rpcItem.http;
      data.push(...http.map((url) => ({ name: item, type: "http" as any, url })));
      if (rpcItem.webSocket) {
        data.push(...rpcItem.webSocket.map((url) => ({ name: item, type: "webSocket" as any, url })));
      }
      return data;
    })
  );
}

function createPCS(chainId: number) {
  const chain = SUPPORT_CHAINS.find((c) => c.id == chainId)!;
  if (!chain) throw `No Chain for chianId:${chainId}`;
  const rpcls = getRpcurls(chain);
  console.info("chainid:", chainId, "rpcs:", rpcls);
  if (rpcls.length == 0) throw `No Chain rpc for chianId:${chainId}`;
  const pcs = rpcls.map((rpc, index) => {
    const pc = createPublicClient({
      name: `${rpc.name}-${rpc.type}-${index}`,
      batch: { multicall: multicallBatchConfig },
      chain: SUPPORT_CHAINS.find((c) => c.id == chainId)!,
      transport: http(rpc.url, { batch: apiBatchConfig }),
    });
    return pc;
  });
  return pcs;
}
export function getPC(chainId: number, index?: number) {
  if (!pcMaps[chainId]) {
    pcMaps[chainId] = { pcs: createPCS(chainId), current: 0 };
  }
  const item = pcMaps[chainId];
  if (typeof index !== "undefined") {
    if (index >= item.pcs.length) throw "Index error for pcs";
    return item.pcs[index];
  } else {
    const pc = item.pcs[item.current];
    item.current++;
    if (item.current >= item.pcs.length) item.current = 0;
    return pc;
  }
}

export function getPCBy({ chain, index, name, type }: { chain: number; index?: number; name?: string; type?: "http" | "webSocket" }) {
  if (!pcMaps[chain]) {
    pcMaps[chain] = { pcs: createPCS(chain), current: 0 };
  }
  const pcs = pcMaps[chain];
  if (isNumber(index)) return pcs.pcs[index];
  const clients = pcs.pcs.filter((item) => (!name || item.name.startsWith(`${name}-`)) && (!type || item.type == type));
  return clients[random(clients.length - 1)];
}
