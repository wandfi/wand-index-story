import { getTokenPricesBySymbol } from "@/lib/alchemy";
import { formatEther } from "viem";

const price = await getTokenPricesBySymbol('MON')
console.info(price, formatEther(price))