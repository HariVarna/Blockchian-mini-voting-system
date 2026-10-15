# 🗳️ VoteSphere — Complete Step-by-Step Running & Testing Tutorial

Welcome to the **VoteSphere** tutorial! This guide provides a complete, step-by-step walkthrough for configuring, launching, and interacting with the decentralized blockchain voting system locally.

---

## 📑 Table of Contents
1. [Architecture Overview](#1-architecture-overview)
2. [Prerequisites](#2-prerequisites)
3. [Quick Start (Cheatsheet)](#3-quick-start-cheatsheet)
4. [Step-by-Step Setup Guide](#4-step-by-step-setup-guide)
   - [Step 1: Install Dependencies](#step-1-install-dependencies)
   - [Step 2: Configure Environment Variables](#step-2-configure-environment-variables)
   - [Step 3: Setup & Seed Database](#step-3-setup--seed-database)
   - [Step 4: Start Local Hardhat Blockchain](#step-4-start-local-hardhat-blockchain)
   - [Step 5: Deploy Smart Contracts](#step-5-deploy-smart-contracts)
   - [Step 6: Start Backend API](#step-6-start-backend-api)
   - [Step 7: Start Frontend Web App](#step-7-start-frontend-web-app)
5. [MetaMask Wallet Setup](#5-metamask-wallet-setup)
6. [End-to-End User Testing Guide](#6-end-to-end-user-testing-guide)
   - [Voter Flow (Registration, OTP & Voting)](#voter-flow)
   - [Preventing Duplicate Votes](#preventing-duplicate-votes)
   - [Admin Multisig Governance Flow](#admin-multisig-governance-flow)
   - [Closing Election & Publishing Results](#closing-election--publishing-results)
7. [Running Automated Tests](#7-running-automated-tests)
8. [Troubleshooting & Common Issues](#8-troubleshooting--common-issues)

---

## 1. Architecture Overview

VoteSphere consists of three integrated layers:

```
┌─────────────────────────────────────────────────────────────┐
│                    Next.js 14 Frontend                      │
│      (Port 3000) • Web3 Wallet & Voter/Admin Portals        │
└───────────────┬─────────────────────────────┬───────────────┘
                │                             │
                ▼                             ▼
┌──────────────────────────────┐ ┌────────────────────────────┐
│      Express Backend API     │ │     Hardhat Local Chain    │
│   (Port 5001) • SQLite DB    │ │  (Port 8545 - Chain 31337) │
│  OTP & Ballot Encrypt/Tally  │ │   Smart Contract State     │
└──────────────────────────────┘ └────────────────────────────┘
```

- **Smart Contracts** (`contracts/`): Solidity 0.8.24 contracts (`VotingSystem.sol` & `AdminMultisig.sol`).
- **Backend API** (`backend/`): Node.js/Express + Prisma (SQLite) handling OTP auth, client key distribution, off-chain ballot storage, and zero-knowledge commitments.
- **Frontend** (`frontend/`): Next.js 14 App Router, Ethers.js v6, Tailwind CSS, Lucide icons.

---

## 2. Prerequisites

Ensure you have installed:
- **Node.js**: `v18.17.0` or higher (`node -v`)
- **npm**: `v9.0.0` or higher (`npm -v`)
- **MetaMask Browser Extension**: [Download MetaMask](https://metamask.io/) for Chrome / Brave / Firefox / Edge.
- **Git** (optional, for cloning)

---

## 3. Quick Start (Cheatsheet)

For experienced developers who want to get running immediately in 4 terminal tabs:

```bash
# Terminal 1: Local Blockchain
cd contracts && npm install && npm run node:local

# Terminal 2: Deploy Contracts
cd contracts && npm run deploy:local

# Terminal 3: Backend API & Database
cd backend && npm install && npx prisma db push && npm run seed && npm run dev

# Terminal 4: Frontend Web App
cd frontend && npm install && npm run dev
```

Visit **http://localhost:3000** in your browser.

---

## 4. Step-by-Step Setup Guide

### Step 1: Install Dependencies

Open your terminal in the project root directory:

```bash
# 1. Install contract dependencies
cd contracts
npm install

# 2. Install backend dependencies
cd ../backend
npm install

# 3. Install frontend dependencies
cd ../frontend
npm install

# Return to root directory
cd ..
```

---

### Step 2: Configure Environment Variables

The repository comes with default development configurations. If `.env` files are missing, copy `.env.example`:

1. **Root `.env`**:
   ```bash
   cp .env.example .env
   ```
2. **Backend `.env`** (`backend/.env`):
   ```env
   DATABASE_URL="file:./dev.db"
   PORT=5001
   JWT_SECRET="super_secret_jwt_blockchain_voting_key_change_in_production"
   ENCRYPTION_SECRET="aes_256_ballot_encryption_master_key_change_me_32chars!"
   OTP_EXPIRY_MINUTES=10
   OTP_MAX_ATTEMPTS=3
   OTP_COOLDOWN_SECONDS=60
   ```
3. **Frontend `.env.local`** (`frontend/.env.local`):
   ```env
   NEXT_PUBLIC_CHAIN_ID=31337
   NEXT_PUBLIC_RPC_URL=http://127.0.0.1:8545
   NEXT_PUBLIC_BACKEND_URL=http://localhost:5001
   ```

*(Note: Contract addresses are automatically synced into frontend and backend when you run the deploy script!)*

---

### Step 3: Setup & Seed Database

Initialize the SQLite database with Prisma and insert sample candidates and election data:

```bash
cd backend
npx prisma db push
npm run seed
```

Output should confirm:
- Sample election created: `2026 Global Decentralized Governance Election`
- 3 candidates seeded (Dr. Elena Rostova, Marcus Vance, Amina Al-Mansoor)
- Sample voter user registered (`Alice Voter` at `0x70997970C51812dc3A010C7d01b50e0d17dc79C8`)

---

### Step 4: Start Local Hardhat Blockchain

In **Terminal 1**, run the local Hardhat Ethereum node:

```bash
cd contracts
npm run node:local
```

> **Important**: Keep this terminal window open. The node runs at `http://127.0.0.1:8545` and prints 20 pre-funded test accounts with 10,000 ETH each.

---

### Step 5: Deploy Smart Contracts

In **Terminal 2**, deploy the smart contracts (`AdminMultisig.sol` and `VotingSystem.sol`) to the local node:

```bash
cd contracts
npm run deploy:local
```

This script will:
1. Deploy `AdminMultisig` (2-of-3 multisig).
2. Deploy `VotingSystem`.
3. Automatically export addresses and ABIs to:
   - `deployments.json`
   - `frontend/src/contracts/deployments.json`
   - `backend/src/contracts/deployments.json`

---

### Step 6: Start Backend API

In **Terminal 3**, launch the Express API server:

```bash
cd backend
npm run dev
```

The API will start at: **`http://localhost:5001`**

---

### Step 7: Start Frontend Web App

In **Terminal 4**, launch the Next.js development server:

```bash
cd frontend
npm run dev
```

The web application will start at: **`http://localhost:3000`**

---

## 5. MetaMask Wallet Setup

To interact with the dApp, configure MetaMask to connect to your local Hardhat node.

### 1. Add Local Network to MetaMask
1. Open MetaMask extension.
2. Click the **Network Selector** dropdown in the top-left corner -> Click **Add Network** -> **Add a network manually**.
3. Enter the following details:
   - **Network Name**: `Hardhat Localhost`
   - **New RPC URL**: `http://127.0.0.1:8545`
   - **Chain ID**: `31337`
   - **Currency Symbol**: `ETH`
4. Click **Save** and switch to `Hardhat Localhost`.

### 2. Import Hardhat Test Accounts
Import test accounts into MetaMask using their private keys:

| Role | Address | Private Key |
|---|---|---|
| **Deployer / Admin 1** | `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266` | `0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80` |
| **Admin 2 / Seeded Voter** | `0x70997970C51812dc3A010C7d01b50e0d17dc79C8` | `0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d` |
| **Admin 3** | `0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC` | `0x5de4111afa1a4b94908f83103eb219e863cac2f719fb4453cf2e529dac2e14f7` |
| **Voter Account 2** | `0x90F79bf6EB2c4f870365E785982E1f101E93b906` | `0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6` |

**How to Import:**
1. In MetaMask, click the **Account circle icon** in the top right.
2. Select **Import account**.
3. Paste the **Private Key** and click **Import**.

---

## 6. End-to-End User Testing Guide

### Voter Flow

1. **Connect Wallet**:
   - Go to `http://localhost:3000`.
   - Click **Connect Wallet** in the navbar and select `Account #2` (`0x7099...79C8`).
2. **Voter Registration & OTP Verification**:
   - Navigate to **Voter Portal** (`/voter`).
   - Enter Full Name: `Alice Voter` and Email: `alice@example.com`.
   - Click **Send OTP Code**.
   - In development mode, the OTP code is logged in the backend terminal and displayed in the UI preview box (e.g. `123456`).
   - Enter the 6-digit code and click **Verify Identity**.
3. **Cast Ballot**:
   - Click **Proceed to Voting Booth** or go to `/voter/vote`.
   - Select a candidate (e.g., *Dr. Elena Rostova*).
   - Click **Review & Cast Vote**.
   - Enter the pre-vote OTP security challenge code.
   - Confirm the transaction popup in MetaMask to invoke `castVote(...)`.
4. **Receipt Confirmation**:
   - Once mined, you are redirected to `/voter/success` displaying:
     - Transaction Hash
     - Cryptographic Ballot Commitment Hash (`keccak256`)
     - Block Number and Timestamp

---

### Preventing Duplicate Votes

1. While still connected with `Account #2`, navigate back to `/voter/vote`.
2. Notice the UI shows that your wallet has already cast a vote for this election.
3. If an on-chain vote transaction is attempted again, the smart contract will revert with `AlreadyVoted()`.

---

### Admin Multisig Governance Flow

The voting system is governed by a **2-of-3 Multi-Signature** contract.

1. **Switch Account in MetaMask** to **Admin 1** (`0xf39F...2266`).
2. Navigate to **Admin Portal** (`http://localhost:3000/admin/dashboard`).
3. Go to **Proposals & Approvals** (`/admin/approvals`).
4. **Create a Proposal** (e.g., Pause Election or Update Election Parameters):
   - Propose an action -> Sign the transaction in MetaMask.
5. **Second Approval**:
   - Switch MetaMask to **Admin 2** (`0x7099...79C8`).
   - Refresh the page and click **Confirm / Execute Proposal**.
   - Since 2 out of 3 signatures are reached, the proposal executes on-chain!

---

### Closing Election & Publishing Results

1. In the Admin Portal, navigate to **Ballot Tally & Results** (`/admin/results`).
2. Click **Close Election & Tally Ballots**:
   - The backend retrieves the encrypted ballots, decrypts them securely off-chain, and tallies candidate scores.
3. Click **Publish On-Chain Results**:
   - The final canonical tally hash is committed to `VotingSystem.sol`.
4. Public users can now visit `/results` to view the finalized, verifiable election outcome!

---

## 7. Running Automated Tests

Run the smart contract test suite containing 17 unit and integration tests:

```bash
cd contracts
npm run test
```

Expected output:
```text
  VotingSystem Contract
    ✔ Should initialize election with correct parameters
    ✔ Should register candidate correctly
    ✔ Should allow verified voter to cast encrypted vote
    ✔ Should reject duplicate votes from the same wallet
    ✔ Should reject votes cast after election end time
    ✔ Should allow 2-of-3 multisig to pause and resume election
    ...
  17 passing
```

---

## 8. Troubleshooting & Common Issues

### Issue 1: "Nonce too high" or Transaction Stuck in MetaMask
- **Why**: Restarting the local Hardhat node resets the blockchain state to block 0, but MetaMask remembers past transaction counts.
- **Fix**: In MetaMask, go to **Settings** -> **Advanced** -> Click **Clear activity tab data** (or **Reset Account**).

---

### Issue 2: `ECONNREFUSED 127.0.0.1:8545`
- **Why**: Local Hardhat node is not running.
- **Fix**: Open a terminal, run `cd contracts && npm run node:local`, and leave it running.

---

### Issue 3: Contract Address Mismatch or RPC Errors
- **Why**: Re-deploying contracts generates new addresses.
- **Fix**: Run `cd contracts && npm run deploy:local`. The script automatically updates `deployments.json` in both `frontend/` and `backend/`. Refresh your browser window.

---

### Issue 4: Database Out of Sync
- **Why**: Schema changes or dirty mock records in SQLite.
- **Fix**:
  ```bash
  cd backend
  npx prisma db push --force-reset
  npm run seed
  ```

---

### Issue 5: Port Collisions (`Port 3000` or `Port 5001` already in use)
- **Windows (PowerShell)**:
  ```powershell
  # Find process using port 3000 or 5001
  netstat -ano | findstr :3000
  netstat -ano | findstr :5001
  # Kill process by PID
  taskkill /PID <PID> /F
  ```
- **macOS / Linux**:
  ```bash
  kill -9 $(lsof -t -i:3000)
  kill -9 $(lsof -t -i:5001)
  ```

---

## 📚 Related Documentation
- [System Architecture](file:///docs/architecture.md)
- [Smart Contract Specification](file:///docs/smart-contract.md)
- [Security & Multisig Model](file:///docs/security.md)
- [Privacy & Encryption Model](file:///docs/privacy.md)
- [Backend REST API Reference](file:///docs/api.md)
- [Testnet Deployment Guide](file:///docs/deployment.md)
