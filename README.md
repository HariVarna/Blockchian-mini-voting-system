# VoteSphere — Decentralized Blockchain Mini Voting System

![Next.js](https://img.shields.io/badge/Next.js-14%2B-black?style=flat-square&logo=next.js)
![Solidity](https://img.shields.io/badge/Solidity-0.8.24-363636?style=flat-square&logo=solidity)
![Hardhat](https://img.shields.io/badge/Hardhat-Ethereum-yellow?style=flat-square)
![Prisma](https://img.shields.io/badge/Prisma-SQLite-2D3748?style=flat-square&logo=prisma)
![TailwindCSS](https://img.shields.io/badge/Tailwind-CSS-38B2AC?style=flat-square&logo=tailwind-css)
![OpenZeppelin](https://img.shields.io/badge/OpenZeppelin-Contracts-4E5EE4?style=flat-square&logo=openzeppelin)

A decentralized, privacy-preserving, and verifiable digital election system built with Ethereum smart contracts, 2-of-3 multi-signature governance, off-chain OTP identity verification, and client-side encrypted ballot commitments.

> 📖 **Looking for a complete step-by-step setup tutorial?** See [HOW_TO_RUN.md](file:///HOW_TO_RUN.md) for full MetaMask setup, local node configuration, seeding, and an interactive testing guide.

---

## 1. Key Features

- 🔐 **Privacy-Preserving Architecture**: Ballots are encrypted client-side using AES-256-GCM. Only cryptographic commitments (`keccak256`) are stored on-chain.
- ⛓️ **One Wallet, One Vote**: Enforced directly on the Ethereum smart contract via immutable mapping state, preventing duplicate vote attempts.
- 🛡️ **2-of-3 Multisig Governance**: Critical admin actions (opening/closing elections, publishing tallies, emergency pause) require multi-signature approvals.
- 📱 **Two-Factor Identity Verification**: Off-chain 6-digit OTP verification binds voter legal names and emails to wallet addresses without exposing PII on the public blockchain.
- ⏳ **Automated Boundary Timers**: Smart contracts dynamically calculate election states using `block.timestamp` and reject late submissions automatically.
- ⚖️ **Deterministic Tie Resolution**: Clear tie detection mechanisms prevent arbitrary winner selection.
- 📊 **Verifiable On-Chain Results**: Final results are cryptographically committed to the blockchain with a canonical result hash.
- 🚨 **Circuit Breaker (Pausable)**: Emergency pause functionality protects election integrity in unforeseen circumstances.

---

## 2. Technology Stack

- **Smart Contracts**: Solidity 0.8.24, OpenZeppelin Contracts, Hardhat, TypeChain, Ethers.js v6.
- **Backend**: Node.js, Express, TypeScript, Prisma ORM, SQLite, Nodemailer, Rate Limiting, AES-256-GCM.
- **Frontend**: Next.js 14+ (App Router), React 18, TypeScript, Tailwind CSS, Lucide Icons, Canvas Confetti.

---

## 3. Project Structure

```
/blockchain-voting-system
├── /contracts             # Solidity contracts, Hardhat test suite, deployment scripts
│   ├── contracts/
│   │   ├── VotingSystem.sol    # Core voting contract
│   │   └── AdminMultisig.sol   # 2-of-3 multisig governance
│   ├── test/
│   │   └── VotingSystem.test.ts # 17 comprehensive unit tests
│   └── scripts/
│       └── deploy.ts           # Automated multi-network deployer
├── /backend               # Off-chain Node.js/Express API service
│   ├── prisma/
│   │   └── schema.prisma       # Database models (User, OtpVerification, Election, Candidate, Ballot, Result)
│   └── src/
│       ├── services/           # OTP, encryption, blockchain sync services
│       └── routes/             # REST endpoints (auth, voter, election, candidate, ballot, results, admin)
├── /frontend              # Modern Next.js web application
│   └── src/
│       ├── app/                # App Router pages (voter flow, admin portal, booth, results)
│       ├── components/         # Reusable cards, timers, OTP modals, navbars
│       └── context/            # Web3 MetaMask wallet context
├── /docs                  # Comprehensive architecture & security specifications
│   ├── architecture.md
│   ├── smart-contract.md
│   ├── security.md
│   ├── privacy.md
│   ├── api.md
│   └── deployment.md
├── package.json
└── README.md
```

---

## 4. Quick Start & Local Setup

### Prerequisites
- Node.js `v18+` or `v20+` or `v24+`
- npm `v9+`
- MetaMask browser extension

### Step 1: Install Dependencies
```bash
# 1. Install contracts dependencies
cd contracts && npm install

# 2. Install backend dependencies
cd ../backend && npm install

# 3. Install frontend dependencies
cd ../frontend && npm install
```

### Step 2: Initialize Database & Seed Sample Data
```bash
cd backend
npx prisma db push
npm run seed
```

### Step 3: Run Smart Contract Tests
```bash
cd contracts
npm run test
```
*Expected: 17/17 tests passing!*

### Step 4: Launch Local Development Services
In separate terminal windows:

**Terminal 1 — Local Blockchain Node:**
```bash
cd contracts
npm run node:local
```

**Terminal 2 — Deploy Contracts to Localhost:**
```bash
cd contracts
npm run deploy:local
```

**Terminal 3 — Start Backend API:**
```bash
cd backend
npm run dev
```
*(Runs on `http://localhost:5001`)*

**Terminal 4 — Start Frontend Web App:**
```bash
cd frontend
npm run dev
```
*(Runs on `http://localhost:3000`)*

---

## 5. End-to-End Voting Walkthrough

1. **Open Frontend**: Navigate to `http://localhost:3000`.
2. **Connect Wallet**: Click **"Connect Wallet"** in the top navbar and approve the connection in MetaMask (use Hardhat Account #2 `0x70997970C51812dc3A010C7d01b50e0d17dc79C8`).
3. **Verify Identity**:
   - Go to **Voter Portal** (`/voter`).
   - Enter your name and email (e.g. `alice@example.com`).
   - Enter the 6-digit OTP code shown in the dev preview box or backend logs.
4. **Cast Ballot**:
   - Enter the **Voting Booth** (`/voter/vote`).
   - Select your candidate of choice.
   - Click **"Review & Cast Vote"** and confirm.
   - Enter the pre-vote OTP challenge.
   - Sign the `castVote` transaction in MetaMask.
5. **Confirmation**:
   - View your immutable on-chain voting receipt and transaction hash at `/voter/success`.
6. **Try Duplicate Vote**:
   - Attempt to vote again with the same wallet: the system will immediately notify you that your wallet has already voted.
7. **Admin Governance & Results**:
   - Access the **Admin Portal** (`/admin/dashboard`).
   - Review 2-of-3 multisig proposals at `/admin/approvals`.
   - Close voting and initiate **Ballot Tally** at `/admin/results`.
   - Publish the cryptographic result hash on-chain!

---

## 6. Privacy & Secrecy Model

> [!IMPORTANT]
> Public blockchains are completely transparent. Putting plaintext votes directly into transactions allows everyone on the network to see who voted for whom. VoteSphere protects voter privacy by encrypting ballot choices client-side (AES-256-GCM) and only submitting a cryptographic commitment (`bytes32`) on-chain. Only authorized administrators tally the aggregate results upon election closure.

---

## 7. License

MIT License. Designed and engineered for academic and production digital governance research.
