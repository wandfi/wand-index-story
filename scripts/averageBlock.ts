import { createPublicClient, http } from "viem";
import { arbitrum, base, berachain, bsc, sei, story } from "viem/chains";

const chains = [story];

for (const chain of chains) {
  const pc = createPublicClient({ chain, transport: http() });
  const latest = await pc.getBlock({ blockTag: "latest" });
  const old = await pc.getBlock({ blockNumber: latest.number - 100000n > 0n ? latest.number - 100000n : 1n });
  const blocksPerHour = ((latest.number - old.number) * 60n * 60n) / (latest.timestamp - old.timestamp);
  console.info(chain.name, { blocksPerHour, blocksPer15minutes: blocksPerHour / 4n });
}
