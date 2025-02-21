import "reflect-metadata"

import { startApi } from "@/api";
import { prepareDB } from "@/db";
import { startSchedules } from "@/schedule";
async function main() {
  await prepareDB();
  await startSchedules();
  await startApi();
}
main().catch(console.error);
