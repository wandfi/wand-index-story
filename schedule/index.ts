import indexBlockTime from "./index_block_time";
import indexBlockTimeV2 from "./index_block_time_v2";
import indexBvault2Charts from "./index_bvault2_charts";
import indexBvaultSEpochPtSynthetic from "./index_bvault_epoch_pt_synthetic";
import indexBvaultSEpochYTprice from "./index_bvault_epoch_yt_price";
import indexBvaultSEpochYTpriceV2 from "./index_bvault_epoch_yt_price_v2";
import indexEvents from "./index_events";
import indexEventsV2 from "./index_events_v2";
import indexPointsData from "./index_points_data";
(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};
export async function startSchedules() {
  indexEvents();
  indexBlockTime();
  indexBvaultSEpochYTprice();
  indexBvaultSEpochYTpriceV2();
  indexBvaultSEpochPtSynthetic();

  indexEventsV2();
  indexPointsData();

  indexBlockTimeV2();
  indexBvault2Charts();
}
