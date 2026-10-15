import { ethers } from "ethers";
import { config } from "../config";
import { prisma } from "../db";
import * as path from "path";
import * as fs from "fs";

let provider: ethers.JsonRpcProvider | null = null;
let votingContract: ethers.Contract | null = null;
let multisigContract: ethers.Contract | null = null;

function getDeploymentInfo() {
  const deploymentPath = path.resolve(__dirname, "../contracts/deployments.json");
  if (fs.existsSync(deploymentPath)) {
    try {
      return JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
    } catch {
      return null;
    }
  }
  return null;
}

function getContractABIs() {
  const votingPath = path.resolve(__dirname, "../contracts/VotingSystem.json");
  const multisigPath = path.resolve(__dirname, "../contracts/AdminMultisig.json");

  let votingAbi = null;
  let multisigAbi = null;

  if (fs.existsSync(votingPath)) {
    votingAbi = JSON.parse(fs.readFileSync(votingPath, "utf8")).abi;
  }
  if (fs.existsSync(multisigPath)) {
    multisigAbi = JSON.parse(fs.readFileSync(multisigPath, "utf8")).abi;
  }

  return { votingAbi, multisigAbi };
}

export const blockchainService = {
  getProvider(): ethers.JsonRpcProvider {
    if (!provider) {
      provider = new ethers.JsonRpcProvider(config.blockchain.rpcUrl);
    }
    return provider;
  },

  getContracts() {
    const deployment = getDeploymentInfo();
    const { votingAbi, multisigAbi } = getContractABIs();
    const currentProvider = this.getProvider();

    const votingAddr = config.blockchain.votingContractAddress || deployment?.votingSystemAddress;
    const multisigAddr = config.blockchain.multisigContractAddress || deployment?.adminMultisigAddress;

    if (votingAddr && votingAbi) {
      votingContract = new ethers.Contract(votingAddr, votingAbi, currentProvider);
    }
    if (multisigAddr && multisigAbi) {
      multisigContract = new ethers.Contract(multisigAddr, multisigAbi, currentProvider);
    }

    return {
      votingContract,
      multisigContract,
      votingAddress: votingAddr,
      multisigAddress: multisigAddr,
      chainId: deployment?.chainId || config.blockchain.chainId,
    };
  },

  async getOnChainElectionDetails(electionId: number) {
    try {
      const { votingContract } = this.getContracts();
      if (!votingContract) return null;
      const details = await votingContract.getElectionDetails(electionId);
      return {
        id: Number(details[0]),
        title: details[1],
        metadataURI: details[2],
        startTime: Number(details[3]),
        endTime: Number(details[4]),
        state: Number(details[5]), // 0: NOT_CREATED, 1: NOT_STARTED, 2: OPEN, 3: CLOSED, 4: RESULTS_PUBLISHED, 5: PAUSED
        candidateCount: Number(details[6]),
        totalVotesCast: Number(details[7]),
        resultHash: details[8],
        winnerCandidateId: Number(details[9]),
        isTie: Boolean(details[10]),
      };
    } catch (err) {
      console.warn(`Could not fetch on-chain election ${electionId}:`, err);
      return null;
    }
  },

  async verifyTransactionReceipt(txHash: string) {
    try {
      const p = this.getProvider();
      const receipt = await p.getTransactionReceipt(txHash);
      if (!receipt) return { confirmed: false };
      return {
        confirmed: receipt.status === 1,
        blockNumber: receipt.blockNumber,
        status: receipt.status,
      };
    } catch (err) {
      return { confirmed: false, error: (err as Error).message };
    }
  },

  async syncBlockchainState() {
    try {
      const { votingContract } = this.getContracts();
      if (!votingContract) return;

      const elections = await prisma.election.findMany();
      for (const el of elections) {
        const onChain = await this.getOnChainElectionDetails(el.blockchainElectionId);
        if (onChain) {
          const stateNames = ["NOT_CREATED", "NOT_STARTED", "OPEN", "CLOSED", "RESULTS_PUBLISHED", "PAUSED"];
          const newStatus = stateNames[onChain.state] || el.status;
          if (newStatus !== el.status) {
            await prisma.election.update({
              where: { id: el.id },
              data: { status: newStatus },
            });
            console.log(`🔄 Synced election ${el.blockchainElectionId} status to: ${newStatus}`);
          }
        }
      }
    } catch (e) {
      console.error("Blockchain sync error:", e);
    }
  }
};
