import indexBvault2Charts from "./index_bvault2_charts";
import indexBvaultSEpochPtSynthetic from "./index_bvault_epoch_pt_synthetic";
import indexBvaultSEpochYTpriceV2 from "./index_bvault_epoch_yt_price_v2";
import indexEvents from "./index_events";
import indexEventsV2 from "./index_events_v2";
// import indexPointsData from "./index_points_data_for_aria";
(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};
export async function startSchedules() {
  indexEvents();
  
  indexBvaultSEpochYTpriceV2();
  indexBvaultSEpochPtSynthetic();

  indexEventsV2();
  // indexPointsData();
  
  indexBvault2Charts();
}
