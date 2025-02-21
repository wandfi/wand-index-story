import type { Address } from "viem";
import { getPC } from "./publicClient";
import { sepolia } from "viem/chains";
import abiLntVault from "@/configs/abiLntVault";
import { sleep } from "./utils";

const caches = {};
const subAbi = abiLntVault.filter((item) => item.name == "nftToken");
export async function cacheGetNftAddress(lntVault: Address) {
  if (caches[lntVault]) return caches[lntVault] as Address;
  while (true) {
    try {
      const nftAddress = await getPC(sepolia.id).readContract({ abi: subAbi, address: lntVault, functionName: "nftToken" });
      caches[lntVault] = nftAddress;
      return nftAddress;
    } catch (error) {
      await sleep(1000);
    }
  }
}
