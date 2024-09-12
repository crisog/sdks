import { ZeroAddress } from "ethers";

import { Vault } from "@morpho-org/blue-sdk";

import { MetaMorphoOperations } from "../../operations";
import { handleErc20Operation } from "../erc20";
import { OperationHandler } from "../types";

export const handleMetaMorphoAccrueInterestOperation: OperationHandler<
  MetaMorphoOperations["MetaMorpho_AccrueInterest"]
> = ({ address }, data) => {
  const vault = data.getAccrualVault(address);
  const newVault = vault.accrueInterest(data.timestamp);

  data.metamorpho.vaultsData[address] = new Vault(newVault);

  const feeShares = newVault.totalSupply - vault.totalSupply;

  // Mint fee shares.
  if (feeShares > 0n && vault.feeRecipient !== ZeroAddress) {
    handleErc20Operation(
      {
        type: "Erc20_Transfer",
        sender: address,
        address,
        args: {
          amount: feeShares,
          from: ZeroAddress,
          to: vault.feeRecipient,
        },
      },
      data,
    );
  }
};
