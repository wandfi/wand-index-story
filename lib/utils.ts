export const DECIMAL = 10n ** 18n;
export function getEnv(value: string, defaultValue: any = ""): string {
  return process.env[value] || `${defaultValue}`;
}
export function loopRun(name: string, fn: () => Promise<void>, wait = 2000) {
  const ac = new AbortController();
  const loop = async () => {
    while (true) {
      ac.signal.throwIfAborted();
      try {
        await fn();
      } catch (error) {
        console.error(`${name}_Error`, error);
      }
      await new Promise((resovle) => setTimeout(resovle, wait));
    }
  };
  loop().catch(console.error);
  return ac;
}

export function eqAddress(a1: string, a2: string) {
  if (!a1 || !a2) return false;
  return a1.toLowerCase() == a2.toLowerCase();
}

export function sleep(time: number) {
  return new Promise<void>((resolve, reject) => {
    setTimeout(() => {
      resolve();
    }, time);
  });
}

export function timestamp(): number {
  return Math.floor(new Date().getTime() / 1000);
}

export function bigintMin(nums: bigint[]) {
  if (nums.length == 0) return 0n;
  let min = nums[0];
  nums.forEach((num) => {
    min = num < min ? num : min;
  });
  return min;
}
export function bigintMax(nums: bigint[]){
  if (nums.length == 0) return 0n;
  let max = nums[0];
  nums.forEach((num) => {
    max = num > max ? num : max;
  });
  return max;
}

export function toMap<T, K extends string | number | symbol>(list: T[], by: keyof T | ((item: T) => K)) {
  const mBy = (item: T) => (typeof by == "function" ? by(item) : item[by]);
  return list.reduce<{ [k: string]: T }>((map, item) => ({ ...map, [`${mBy(item)}`]: item }), {});
}


export function createRunWithPool() {
  const poolBusy: {
    [pn: string]: { busy: Promise<any>; unBusy: () => void };
  } = {};

  const createBusy = (): (typeof poolBusy)[string] => {
    let unBusy: () => void = () => {};
    const busy = new Promise<void>((resolve) => {
      unBusy = resolve;
    });
    return { unBusy, busy };
  };
  async function runWithPool<T>(poolName: string, run: () => Promise<T>) {
    const lastBusy = poolBusy[poolName];
    const mBusy = createBusy();
    poolBusy[poolName] = mBusy;
    try {
      lastBusy && (await lastBusy.busy);
      return await run();
    } catch (error) {
    } finally {
      mBusy.unBusy();
    }
  }
  return runWithPool;
}