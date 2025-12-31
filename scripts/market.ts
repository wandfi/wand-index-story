import { BVAULT2_CONFIGS } from "@/configs/bvaults2";
import { getPC, getPCBy } from "@/lib/publicClient";
import { parseAbi } from "viem";

for (const vc of BVAULT2_CONFIGS) {
  const market = await getPCBy({ chain: vc.chain, name: "alchemy" }).readContract({
    abi: parseAbi(["function market() external view returns (address)"]),
    address: vc.vault,
    functionName: "market",
  });
  console.info(vc.vault, "market:", market);
}
export {};
