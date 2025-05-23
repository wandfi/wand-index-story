import { Column, Entity, Index, PrimaryGeneratedColumn, type ValueTransformer } from "typeorm";
import type { Address } from "viem";

export const bnTrans: ValueTransformer = {
  to: (value: bigint) => value.toString(),
  from: (value: string) => BigInt(value),
};
export const timeNumTrans: ValueTransformer = {
  to: (value: number) => new Date(value * 1000).toLocaleString("zh"),
  from: (value: string) => new Date(value).getTime() / 1000,
};

// ************************************************** index_config *****************************************************
@Entity()
export class index_config {
  @PrimaryGeneratedColumn()
  declare id: number;

  @Index({ unique: true })
  @Column({ type: "varchar", length: 255 })
  declare name: string;

  @Column({ type: "decimal", precision: 64, transformer: bnTrans })
  declare vaule: bigint;
}
// ************************************************** index_event *****************************************************
@Entity()
@Index(["address", "table"], { unique: true })
export class index_event {
  @PrimaryGeneratedColumn()
  declare id: number;

  @Column({ type: "varchar", length: 42 })
  declare address: Address;

  @Column({ type: "varchar" })
  declare event: string;

  @Column({ type: "varchar" })
  declare table: string;

  @Column({ type: "decimal", precision: 64, transformer: bnTrans })
  declare start: bigint;
}
// ************************************************** index_block_time *****************************************************
@Entity()
export class index_block_time {
  @PrimaryGeneratedColumn()
  declare id: number;

  @Index({ unique: true })
  @Column({ type: "decimal", precision: 20, transformer: bnTrans })
  declare block: bigint;

  @Column({ type: "timestamp", transformer: timeNumTrans })
  declare time: number;
}
@Entity()
export class index_block_time2 {
  @PrimaryGeneratedColumn()
  declare id: number;

  @Index({ unique: true })
  @Column({ type: "decimal", precision: 20, transformer: bnTrans })
  declare block: bigint;

  @Column({ type: "timestamp", transformer: timeNumTrans })
  declare time: number;
}
class event_base {
  @PrimaryGeneratedColumn()
  declare id: number;
  @Column({ type: "decimal", precision: 20, transformer: bnTrans })
  declare block: bigint;
  @Column({ type: "varchar", length: 42 })
  declare address: Address;
  @Column({ type: "varchar", length: 66 })
  declare tx: Address;
}
// ************************************************** event_bvault_epoch_started *****************************************************
// "event EpochStarted(uint256 epochId,uint256 startTime,uint256 duration,address redeemPool)"
@Entity()
export class event_bvault_epoch_started extends event_base {
  @Column({ type: "decimal", precision: 20, transformer: bnTrans })
  declare epochId: bigint;
  @Column({ type: "decimal", precision: 20, transformer: bnTrans })
  declare startTime: bigint;
  @Column({ type: "decimal", precision: 20, transformer: bnTrans })
  declare duration: bigint;
  @Column({ type: "varchar", length: 42 })
  declare redeemPool: Address;
}
@Entity()
export class event_bvault_epoch_started_v2 extends event_base {
  @Column({ type: "decimal", precision: 20, transformer: bnTrans })
  declare epochId: bigint;

  @Column({ type: "decimal", precision: 20, transformer: bnTrans })
  declare startTime: bigint;

  @Column({ type: "decimal", precision: 20, transformer: bnTrans })
  declare duration: bigint;

  @Column({ type: "varchar", length: 42 })
  declare redeemPool: Address;

  @Column({ type: "varchar", length: 42 })
  declare stakingBribesPool: Address;

  @Column({ type: "varchar", length: 42 })
  declare adhocBribesPool: Address;
}
// ************************************************** event_bvault_deposit *****************************************************
// "event Deposit(uint256 indexed epochId, address indexed user, uint256 assetAmount, uint256 pTokenAmount, uint256 yTokenAmount)"
@Entity()
export class event_bvault_deposit extends event_base {
  @Column({ type: "decimal", precision: 20, transformer: bnTrans })
  declare epochId: bigint;
  @Column({ type: "varchar", length: 42 })
  declare user: Address;
  @Column({ type: "decimal", precision: 64, transformer: bnTrans })
  declare assetAmount: bigint;
  @Column({ type: "decimal", precision: 64, transformer: bnTrans })
  declare pTokenAmount: bigint;
  @Column({ type: "decimal", precision: 64, transformer: bnTrans })
  declare yTokenAmount: bigint;
}
// event Swap(uint256 indexed epochId, address indexed user, uint256 assetAmount, uint256 fees, uint256 pTokenAmount, uint256 yTokenAmount)
@Entity()
export class event_bvault_swap extends event_base {
  @Column({ type: "decimal", precision: 20, transformer: bnTrans })
  declare epochId: bigint;
  @Column({ type: "varchar", length: 42 })
  declare user: Address;
  @Column({ type: "decimal", precision: 64, transformer: bnTrans })
  declare assetAmount: bigint;
  @Column({ type: "decimal", precision: 64, transformer: bnTrans })
  declare fees: bigint;
  @Column({ type: "decimal", precision: 64, transformer: bnTrans })
  declare pTokenAmount: bigint;
  @Column({ type: "decimal", precision: 64, transformer: bnTrans })
  declare yTokenAmount: bigint;
}
// ************************************************** event_erc721_transfer *****************************************************
@Entity() // event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)
export class event_erc721_transfer extends event_base {
  @Column({ type: "varchar", precision: 42 })
  declare from: Address;
  @Column({ type: "varchar", precision: 42 })
  declare to: Address;
  @Column({ type: "decimal", precision: 64, transformer: bnTrans })
  declare tokenId: bigint;
}
// ************************************************** events_lntvault *****************************************************
// event NftDeposit(uint256 indexed epochId, address indexed user, uint256 indexed tokenId)
// event NftDepositClaimed(uint256 indexed epochId, address indexed user, uint256 indexed tokenId);
// event NftRedeem(uint256 indexed epochId, address indexed user, uint256 indexed tokenId);
// event NftRedeemClaimed(uint256 indexed epochId, address indexed user, uint256 indexed tokenId);
// event EpochStarted(uint256 epochId, uint256 startTime, uint256 duration)

export class event_lntvault_nft_base extends event_base {
  @Column({ type: "decimal", precision: 20, transformer: bnTrans })
  declare epochId: bigint;
  @Column({ type: "varchar", length: 42 })
  declare user: Address;
  @Column({ type: "decimal", precision: 64, transformer: bnTrans })
  declare tokenId: bigint;
}
@Entity()
export class event_lntvault_NftDeposit extends event_lntvault_nft_base {}
@Entity()
export class event_lntvault_NftDepositClaimed extends event_lntvault_nft_base {}
@Entity()
export class event_lntvault_NftRedeem extends event_lntvault_nft_base {}
@Entity()
export class event_lntvault_NftRedeemClaimed extends event_lntvault_nft_base {}
@Entity()
export class event_lntvault_EpochStarted extends event_base {
  @Column({ type: "decimal", precision: 20, transformer: bnTrans })
  declare epochId: bigint;
  @Column({ type: "decimal", precision: 20, transformer: bnTrans })
  declare startTime: bigint;
  @Column({ type: "decimal", precision: 20, transformer: bnTrans })
  declare duration: bigint;
}
// ************************************************** index_bvault_epoch_yt_price *****************************************************

@Entity()
@Index(["bvault", "epochId", "time"], { unique: true })
export class index_bvault_epoch_yt_price {
  @PrimaryGeneratedColumn()
  declare id: number;
  @Column({ type: "varchar", length: 42 })
  declare bvault: Address;
  @Column({ type: "decimal", precision: 20, transformer: bnTrans })
  declare epochId: bigint;
  @Column({ type: "decimal", precision: 64, transformer: bnTrans })
  declare price: bigint;
  @Column({ type: "timestamp", transformer: timeNumTrans })
  declare time: number;
}
@Entity()
@Index(["vault", "epochId", "time"], { unique: true })
export class index_lntvault_epoch_yt_price {
  @PrimaryGeneratedColumn()
  declare id: number;
  @Column({ type: "varchar", length: 42 })
  declare vault: Address;
  @Column({ type: "decimal", precision: 20, transformer: bnTrans })
  declare epochId: bigint;
  @Column({ type: "decimal", precision: 64, transformer: bnTrans })
  declare price: bigint;
  @Column({ type: "timestamp", transformer: timeNumTrans })
  declare time: number;
}
// ************************************************** index_bvault_epoch_pt_synthetic *****************************************************

@Entity()
@Index(["bvault", "epochId"], { unique: true })
export class index_bvault_epoch_pt_syntheticV2 {
  @PrimaryGeneratedColumn()
  declare id: number;
  @Column({ type: "varchar", length: 42 })
  declare bvault: Address;
  @Column({ type: "decimal", precision: 20, transformer: bnTrans })
  declare epochId: bigint;
  @Column({ type: "decimal", precision: 64, transformer: bnTrans })
  declare value: bigint;
}

// ************************************************** index_erc721_owner *****************************************************

@Entity()
@Index(["token", "tokenId"], { unique: true })
@Index(["owner"])
export class index_erc721_owner {
  @PrimaryGeneratedColumn()
  declare id: number;
  @Column({ type: "varchar", length: 42 })
  declare token: Address;
  @Column({ type: "decimal", precision: 64, transformer: bnTrans })
  declare tokenId: bigint;
  @Column({ type: "varchar", length: 42 })
  declare owner: Address;
}
// ************************************************** index_lntvault_nftstat *****************************************************

const nftstats = ["Deposited", "DepositedClaimed", "Redeemed", "RedeemedClaimed"] as const;
type NFTSTAT = (typeof nftstats)[number];
@Entity()
@Index(["vault", "tokenId"], { unique: true })
@Index(["user"])
export class index_lntvault_nftstat {
  @PrimaryGeneratedColumn()
  declare id: number;
  @Column({ type: "varchar", length: 42 })
  declare vault: Address;
  @Column({ type: "varchar", length: 42 })
  declare user: Address;
  @Column({ type: "decimal", precision: 64, transformer: bnTrans })
  declare tokenId: bigint;
  @Column({
    type: "tinyint",
    transformer: {
      to: (value: NFTSTAT) => nftstats.findIndex((ns) => ns == value),
      from: (value: number) => nftstats[value],
    },
  })
  declare stat: NFTSTAT;
  @Column({ type: "varchar", length: 66 })
  declare tx: Address;
}

// ************************************************** users *****************************************************
@Entity()
export class users {
  @PrimaryGeneratedColumn()
  declare id: number;

  @Index({ unique: true })
  @Column({ type: "varchar", length: 42 })
  declare name: string;

  @Index({ unique: false })
  @Column({ type: "varchar", default: "admin" })
  declare role: string;
}


// ************************************************** infered vaults evetns **************************************

// event RewardPaid(address indexed user, address indexed rewardsToken, uint256 reward)
@Entity()
export class event_infrared_vault_RewardPaid extends event_base {
  @Column({ type: "varchar", length: 42 })
  declare user: Address;
  @Column({ type: "varchar", length: 42 })
  declare rewardsToken: Address;
  @Column({ type: "decimal", precision: 20, transformer: bnTrans })
  declare reward: bigint;
}

// ************************************************** tables *****************************************************
export const tables = {
  index_config,
  index_event,
  index_block_time,
  index_bvault_epoch_pt_syntheticV2,
  users,
  index_bvault_epoch_yt_price,
  event_bvault_epoch_started,
  event_bvault_epoch_started_v2,
  event_bvault_deposit,
  event_bvault_swap,

  index_block_time2,
  event_erc721_transfer,
  event_lntvault_NftDeposit,
  event_lntvault_NftDepositClaimed,
  event_lntvault_NftRedeem,
  event_lntvault_NftRedeemClaimed,
  event_lntvault_EpochStarted,
  index_lntvault_epoch_yt_price,
  index_erc721_owner,
  index_lntvault_nftstat,

  event_infrared_vault_RewardPaid,
};
