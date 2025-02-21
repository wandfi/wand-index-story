import indexBlockTime from "./index_block_time";
import indexBlockTime2 from "./index_block_time2";
import indexBvaultSEpochPtSynthetic from "./index_bvault_epoch_pt_synthetic";
import indexBvaultSEpochYTprice from "./index_bvault_epoch_yt_price";
import indexBvaultSEpochYTpriceV2 from "./index_bvault_epoch_yt_price_v2";
import indexErc721Owner from "./index_erc721_owner";
import indexEvents from "./index_events";
import indexLntVaultSEpochYTprice from "./index_lntvault_epoch_yt_price";
import indexLntVaultNftstat from "./index_lntvault_nftstat";
;(BigInt.prototype as any).toJSON = function () {
  return this.toString()
}
export async function startSchedules() {
  indexEvents();
  indexBlockTime();
  indexBvaultSEpochYTprice()
  indexBvaultSEpochYTpriceV2()
  indexBvaultSEpochPtSynthetic()

  indexBlockTime2();
  indexLntVaultSEpochYTprice();
  indexLntVaultNftstat();
  indexErc721Owner();
}
