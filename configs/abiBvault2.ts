import { parseAbi } from "viem";

export const abiBVault2 = parseAbi([
  "function initialized() view returns (bool)",
  "function autoStartNewEpoch() external view returns (bool)",
  "function BT() external view returns (address)",
  "function mintPoolTokenPot() external view returns (address)",
  "function Points() external view returns (address)",

  "function bootstrapStartTime() external view returns (uint256)",
  "function bootstrapDuration() external view returns (uint256)",
  "function bootstrapThreshold() external view returns (uint256)",
  "function totalDeposits() external view returns (uint256)",

  "function bootstrapSucceeded() public view returns (bool)",
  "function bootstrapStarted() public view returns (bool)",
  "function bootstrapEnded() public view returns (bool)",
  "function bootstrapFailed() public view returns (bool)",
  "function bootstrapping() public view returns (bool)",
  "function currentEpochId() public view returns (uint256)",
  "function epochIdCount() public view returns (uint256)",
  "function epochIdAt(uint256 index) public view returns (uint256)",
  "function epochInfoById(uint256 epochId) public view returns (Epoch memory)",
  "struct Epoch {uint256 epochId;uint256 startTime;uint256 duration;bool settledOnEnd;address PT;address YT;}",

  "function addLiquidity(uint256 amountBT, uint256 deadline) external returns (uint256 amountShares, uint256 amountPT, uint256 amountYT)",
  "function removeLiquidity(uint256 shares, uint256 minAmountBT, uint256 deadline) external returns (uint256 amountBT, uint256 amountPT, uint256 amountYT)",
  "function swapExactBTforPT(uint256 amountBT, uint256 minAmountPT, uint256 deadline) external",
  "function swapExactPTforBT(uint256 amountPT, uint256 minAmountBT, uint256 deadline) external returns (uint256 amountBT)",
  "function swapExactBTforYT(uint256 amountBT, uint256 amountBT1, uint256 minRefundBT, uint256 deadline) external returns (uint256 amountYT, uint256 refundBT)",
  "function swapExactYTforBT(uint256 amountYT, uint256 minAmountBT, uint256 deadline) external returns (uint256 amountBT)",

  "function updateThreshold(uint256 _threshold) external",
  "function updateBootstrapDuration(uint256 _bootstrapDuration) external",
  "function pause() external",
  "function unpause() external",

  // **************** version 2 ******************************
  // read
  "function maturedPTs() external view returns (address[] memory)",
  "function quoteExactBTforPT(uint256 amountBT) external view returns (uint256 amountPT)",
  "function quoteExactPTforBT(uint256 amountPT) external view returns (uint256 amountBT)",
  "function quoteBTforExactYT(uint256 maxAmountBT, uint256 targetAmountYT) external view returns (uint256 amountBTUsed)",
  "function quoteExactYTforBT(uint256 amountYT) external view returns (uint256 amountBT)",
  // write
  "function bootstrapTotalDeposits() external view returns (uint256)",
  "function points() external view returns (address)",
  "function mintPTandYT(uint256 amount) external",
  "function redeemByPTandYT(uint256 amount) external",
  "function redeemByMaturedPT(address PT, uint256 amount) external",
  "function addLiquidityInstant(uint256 amountBT, uint256 amountBT1, uint256 deadline) external",
  "function swapBTforExactYT(uint256 maxAmountBT, uint256 targetAmountYT, uint256 deadline) external",
  // version 2 owner
  "function setAutoStartNewEpoch(bool autoStart) external",
  "function initialize(address _market, address _hook) external",
]);

export const abiBT = parseAbi([
  "function deposit(address receiver,address tokenIn,uint256 amountTokenToDeposit,uint256 minSharesOut) external payable returns (uint256 amountSharesOut)",
  "function redeem(address receiver,uint256 amountSharesToRedeem,address tokenOut,uint256 minTokenOut) external payable returns (uint256 amountTokenOut)",
  "function previewDeposit(address tokenIn,uint256 amountTokenToDeposit) external view returns (uint256 amountSharesOut)",
  "function previewRedeem(address tokenOut,uint256 amountSharesToRedeem) external view returns (uint256 amountTokenOut)",
  "function getTokensIn() public view returns (address[] memory res)",
  "function getTokensOut() public view returns (address[] memory res)",
  "function exchangeRate() public view returns (uint256 res)",
]);

export const abiHook = parseAbi([
  "function getAmountOutBTToVPT(uint256 amountBT) external view returns (uint256 amountVPT)",
  "function getAmountOutVPTToBT(uint256 amountVPT) external view returns (uint256 amountBT)",
  "function getBTAddress() external view returns (address)",
  "function getReserves() external view returns (uint256 reserveBT, uint256 reserveVPT)",
]);

export const abiBvault2Query = parseAbi([
  // 'function quoteExactBTforYT(address hook,uint256 amountBT,uint256 amountBT1) external view returns (uint256 amountYT, uint256 expectedRefundBT)',
  // 'function quoteExactYTforBT(address hook,uint256 amountYT) external view returns (uint256 amountBT)',
  "function calcBT1ForSwapBTForYT(address hook,uint256 amountBT) external view returns (uint256 bestAmountBT1, uint256 count)",
  "function quoteAddLPInstant(address vault,uint256 amountBT,uint256 count) external view returns (uint256 bt1,uint256 shares)",
  "struct LogData { uint256 BTtp;uint256 BTnet;uint256 Anet;uint256 PTc;uint256 YTc;uint256 vPT;uint256 pt;uint256 Feerate;uint256 ShareTotal;uint256 rateScalar;uint256 rateAnchor;}",
  "function getLog(address vault) external view returns(LogData memory log)",
  "function calcRemoveLP(address vault,uint256 shares) external view returns(uint256 amountBT, uint256 amountPT, uint256 amountYT)",
  "function calcAddLP(address vault,uint256 amountBT) external view returns(uint256 amountPT, uint256 amountYT, uint256 amountShares)",
  "function earned(address irm, address user, uint256 scale) external view returns(Earned[] memory)",
  "struct Earned { address token; uint256 value;}",
]);

export const abiRewardManager = parseAbi([
  "function getUserRewards(address user) external view returns (uint256[] memory rewardAmounts)",
  "function getRewardTokens() public view returns (address[] memory rewardTokens)",
  "function claimRewards(address user) external",
  "function updateRewardIndexes() external",
  "function updateUserRewards(address user) external",
]);

export const abiProtocol = parseAbi(["function addPremiumHook(address BT, address hook) external"]);

export const abiMockInfraredVault = parseAbi(["function addReward(address _rewardsToken, uint256 reward, uint256 rewardsDuration) external payable"]);
