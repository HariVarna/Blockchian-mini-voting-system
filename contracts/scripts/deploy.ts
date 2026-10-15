import { ethers, network } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  const [deployer, admin1, admin2, admin3] = await ethers.getSigners();
  console.log(`\n🚀 Deploying Voting System contracts on network: ${network.name}`);
  console.log(`Deployer: ${deployer.address}`);

  // Determine 3 admin addresses
  const admins: [string, string, string] = [
    admin1 ? admin1.address : deployer.address,
    admin2 ? admin2.address : "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
    admin3 ? admin3.address : "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
  ];

  console.log(`Admin 1: ${admins[0]}`);
  console.log(`Admin 2: ${admins[1]}`);
  console.log(`Admin 3: ${admins[2]}`);

  // Deploy AdminMultisig
  console.log("\n📦 Deploying AdminMultisig (2-of-3)...");
  const AdminMultisigFactory = await ethers.getContractFactory("AdminMultisig");
  const adminMultisig = await AdminMultisigFactory.deploy(admins);
  await adminMultisig.waitForDeployment();
  const multisigAddress = await adminMultisig.getAddress();
  console.log(`✅ AdminMultisig deployed at: ${multisigAddress}`);

  // Deploy VotingSystem
  console.log("\n📦 Deploying VotingSystem...");
  const VotingSystemFactory = await ethers.getContractFactory("VotingSystem");
  const votingSystem = await VotingSystemFactory.deploy(deployer.address, multisigAddress);
  await votingSystem.waitForDeployment();
  const votingAddress = await votingSystem.getAddress();
  console.log(`✅ VotingSystem deployed at: ${votingAddress}`);

  // Export contract addresses & ABIs for frontend and backend
  const deployments = {
    network: network.name,
    chainId: (await ethers.provider.getNetwork()).chainId.toString(),
    votingSystemAddress: votingAddress,
    adminMultisigAddress: multisigAddress,
    deployerAddress: deployer.address,
    adminAddresses: admins,
    deployedAt: new Date().toISOString(),
  };

  const contractsDir = path.resolve(__dirname, "../..");
  const exportPaths = [
    path.join(contractsDir, "deployments.json"),
    path.join(contractsDir, "frontend/src/contracts/deployments.json"),
    path.join(contractsDir, "backend/src/contracts/deployments.json"),
  ];

  const votingArtifact = await import("../artifacts/contracts/VotingSystem.sol/VotingSystem.json");
  const multisigArtifact = await import("../artifacts/contracts/AdminMultisig.sol/AdminMultisig.json");

  for (const expPath of exportPaths) {
    const dir = path.dirname(expPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(expPath, JSON.stringify(deployments, null, 2));
  }

  // Export ABIs
  const abiExportDirs = [
    path.join(contractsDir, "frontend/src/contracts"),
    path.join(contractsDir, "backend/src/contracts"),
  ];

  for (const dir of abiExportDirs) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(path.join(dir, "VotingSystem.json"), JSON.stringify(votingArtifact, null, 2));
    fs.writeFileSync(path.join(dir, "AdminMultisig.json"), JSON.stringify(multisigArtifact, null, 2));
  }

  console.log(`\n📄 Deployment info and ABIs exported successfully to frontend and backend.`);
  console.log("--------------------------------------------------");
  console.log(`NEXT_PUBLIC_CHAIN_ID=${deployments.chainId}`);
  console.log(`NEXT_PUBLIC_VOTING_CONTRACT_ADDRESS=${deployments.votingSystemAddress}`);
  console.log(`NEXT_PUBLIC_MULTISIG_CONTRACT_ADDRESS=${deployments.adminMultisigAddress}`);
  console.log("--------------------------------------------------");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
