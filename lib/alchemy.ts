import { parseEther } from "viem";

export const getTokenPricesBySymbol = async (symbols: string) => {
  const res = await fetch(`https://api.g.alchemy.com/prices/v1/${process.env['ALCHEMY_API_KEY']}/tokens/by-symbol?symbols=${symbols}`);
  const data: { data: { symbol: string; prices: { currency: string; value: string; lastUpdatedAt: string }[] }[] } = (await res.json()) as any;
  const list = data.data.filter((item) => item.prices.length).map((item) => ({ symbol: item.symbol, price: parseEther(item.prices[0].value) }));
  if (list.length == 0) throw new Error("getPrice Error by alchemy");
  return list[0].price;
};

