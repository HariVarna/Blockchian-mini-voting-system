# Multi-Network Deployment Guide

VoteSphere supports automated deployment to local Hardhat, Ethereum Sepolia testnet, and Polygon Amoy testnet.

---

## 1. Local Hardhat Development Deployment

1. Start local blockchain node:
```bash
npm run blockchain
```
(Starts JSON-RPC node on `http://127.0.0.1:8545` with 20 pre-funded test accounts).

2. In a separate terminal, deploy the smart contracts:
```bash
npm run deploy:local
```
The script will deploy `AdminMultisig` and `VotingSystem`, export contract addresses to `deployments.json`, and automatically copy ABIs to `frontend/src/contracts/` and `backend/src/contracts/`.

---

## 2. Ethereum Sepolia Testnet Deployment

1. Configure environment variables in `.env`:
```env
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_ALCHEMY_KEY
SEPOLIA_PRIVATE_KEY=0xYOUR_TESTNET_PRIVATE_KEY
ETHERSCAN_API_KEY=YOUR_ETHERSCAN_API_KEY
```

2. Run deployment:
```bash
npm run deploy:sepolia -w contracts
```

3. Verify contracts on Etherscan:
```bash
npx hardhat verify --network sepolia <VOTING_CONTRACT_ADDRESS> <ADMIN_ADDRESS> <MULTISIG_ADDRESS>
```

---

## 3. Polygon Amoy Testnet Deployment

1. Configure environment variables in `.env`:
```env
POLYGON_AMOY_RPC_URL=https://rpc-amoy.polygon.technology
POLYGON_AMOY_PRIVATE_KEY=0xYOUR_TESTNET_PRIVATE_KEY
```

2. Run deployment:
```bash
npm run deploy:amoy -w contracts
```
