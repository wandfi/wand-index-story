import indexBlockTime from "./index_block_time";
import indexBlockTime2 from "./index_block_time2";
import indexBlockTimeV2 from "./index_block_time_v2";
import indexBvault2Charts from "./index_bvault2_charts";
import indexBvaultSEpochPtSynthetic from "./index_bvault_epoch_pt_synthetic";
import indexBvaultSEpochYTprice from "./index_bvault_epoch_yt_price";
import indexBvaultSEpochYTpriceV2 from "./index_bvault_epoch_yt_price_v2";
import indexErc721Owner from "./index_erc721_owner";
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

  indexBlockTime2();
  indexErc721Owner();
  indexEventsV2();
  indexPointsData();

  indexBlockTimeV2();
  indexBvault2Charts();
}
