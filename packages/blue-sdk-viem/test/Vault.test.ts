import { expect } from "chai";

import { setNextBlockTimestamp } from "@nomicfoundation/hardhat-network-helpers/dist/src/helpers/time";
import { viem } from "hardhat";
import {
  Account,
  Address,
  Chain,
  Client,
  PublicActions,
  TestActions,
  Transport,
  WalletActions,
  WalletRpcSchema,
  publicActions,
  testActions,
  zeroAddress,
} from "viem";

import { ChainId, Vault, addresses } from "@morpho-org/blue-sdk";
import { setUp } from "@morpho-org/morpho-test";

import "../src/augment/Vault";
import { metaMorphoAbi, publicAllocatorAbi } from "../src/abis";
import { steakUsdc } from "./fixtures";

describe("augment/Vault", () => {
  let client: Client<
    Transport,
    Chain,
    Account,
    WalletRpcSchema,
    WalletActions<Chain, Account> &
      PublicActions<Transport, Chain, Account> &
      TestActions
  >;

  setUp(async (block) => {
    client = (await viem.getWalletClients())[0]!
      .extend(publicActions)
      .extend(testActions({ mode: "hardhat" }));

    const owner = await client.readContract({
      address: steakUsdc.address as Address,
      abi: metaMorphoAbi,
      functionName: "owner",
    });
    await client.impersonateAccount({ address: owner });

    await setNextBlockTimestamp(block.timestamp);
    await client.writeContract({
      account: owner,
      address: steakUsdc.address as Address,
      abi: metaMorphoAbi,
      functionName: "setIsAllocator",
      args: [addresses[ChainId.EthMainnet].publicAllocator, true],
    });

    await setNextBlockTimestamp(block.timestamp);
    await client.writeContract({
      account: owner,
      address: addresses[ChainId.EthMainnet].publicAllocator as Address,
      abi: publicAllocatorAbi,
      functionName: "setFee",
      args: [steakUsdc.address as Address, 1n],
    });
  });

  it("should fetch vault data", async () => {
    const expectedData = {
      config: steakUsdc,
      curator: zeroAddress,
      fee: 50000000000000000n,
      feeRecipient: "0x255c7705e8BB334DfCae438197f7C4297988085a",
      guardian: "0xCF0FE65E39C776D2d6Eb420364A5df776c9cFf5f",
      owner: "0x255c7705e8BB334DfCae438197f7C4297988085a",
      pendingGuardian: {
        validAt: 0n,
        value: zeroAddress,
      },
      pendingOwner: zeroAddress,
      pendingTimelock: {
        validAt: 0n,
        value: 0n,
      },
      skimRecipient: zeroAddress,
      publicAllocatorConfig: {
        admin: zeroAddress,
        fee: 1n,
        accruedFee: 0n,
      },
      supplyQueue: [
        "0xb323495f7e4148be5643a4ea4a8221eef163e4bccfdedc2a6f4696baacbc86cc",
        "0x54efdee08e272e929034a8f26f7ca34b1ebe364b275391169b28c6d7db24dbc8",
      ],
      timelock: 604800n,
      withdrawQueue: [
        "0x54efdee08e272e929034a8f26f7ca34b1ebe364b275391169b28c6d7db24dbc8",
        "0xb323495f7e4148be5643a4ea4a8221eef163e4bccfdedc2a6f4696baacbc86cc",
        "0x495130878b7d2f1391e21589a8bcaef22cbc7e1fbbd6866127193b3cc239d8b1",
        "0x06f2842602373d247c4934f7656e513955ccc4c377f0febc0d9ca2c3bcc191b1",
        "0x3a85e619751152991742810df6ec69ce473daef99e28a64ab2340d7b7ccfee49",
      ],
      lastTotalAssets: 26129569140552n,
      totalAssets: 26138939802936n,
      totalSupply: 25752992371062043744406063n,
    };

    const value = await Vault.fetch(steakUsdc.address as Address, client);

    expect(value).to.eql(expectedData);
  });
});