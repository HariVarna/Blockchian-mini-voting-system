# Security Architecture & Threat Model

VoteSphere implements defense-in-depth security across the smart contracts, off-chain backend, authentication layers, and web client.

---

## 1. Smart Contract Access Control & Integrity

### 1.1 One-Wallet-One-Vote Enforcement
Duplicate votes are strictly prevented on-chain using:
```solidity
mapping(uint256 => mapping(address => bool)) public hasVoted;

function castVote(uint256 electionId, bytes32 ballotCommitment) external {
    require(!hasVoted[electionId][msg.sender], "Already voted");
    hasVoted[electionId][msg.sender] = true;
    ...
}
```
Frontend validation provides UX feedback, but on-chain validation guarantees Byzantine fault tolerance.

### 1.2 Multi-Signature Governance (2-of-3)
Critical election operations cannot be executed by any single compromised administrator:
- `openElection`
- `closeElection`
- `publishResults`
- `emergencyPause` / `resume`

The `AdminMultisig.sol` contract enforces `REQUIRED_APPROVALS = 2`. Proposals must receive distinct signatures from at least 2 authorized admin wallets before executing call data on `VotingSystem.sol`.

### 1.3 Circuit Breaker (OpenZeppelin Pausable)
In case of unexpected network congestion or security investigation, authorized admins can trigger `emergencyPause(electionId)`. While paused:
- `whenNotPaused` modifier reverts any new vote attempts.
- Existing on-chain commitments and ballot data remain completely immutable.

---

## 2. Authentication & OTP Defense

### 2.1 OTP Security Rules
- **Length**: 6-digit cryptographically random numeric string (`crypto.randomInt(100000, 999999)`).
- **TTL Expiry**: 10 minutes strictly enforced on server-side timestamps.
- **Hashing**: OTPs are never stored in plaintext in the database. Only SHA-256 salted hashes `H(email : otp : secret)` are persisted.
- **Single-Use**: Upon successful or failed max verification, the OTP is invalidated (`used = true`).
- **Rate Limiting & Cooldown**: Maximum 3 retry attempts per OTP; 60-second cooldown between new OTP dispatch requests; Express IP-based rate limiting (10 requests / 10 minutes).

---

## 3. Threat Model & Mitigation Matrix

| Threat / Attack Vector | Mitigation Architecture |
| :--- | :--- |
| **Sybil Attack (Multiple Votes)** | On-chain mapping `hasVoted[electionId][wallet]` rejects duplicate transactions + OTP binds unique email to wallet. |
| **Tampering with Ballots** | Ballots are encrypted client-side; cryptographic commitment `keccak256(encryptedBallot)` is committed to the blockchain immutably. |
| **Admin Key Compromise** | 2-of-3 Multi-Signature consensus required for critical state changes. |
| **Private Key Phishing** | App never requests, prompts, or stores private keys or seed phrases; interactions rely entirely on standard Web3 signing (MetaMask). |
| **Replay Attacks** | Ballot commitment uniqueness check `!ballotCommitments[electionId][commitment]`. |
| **Post-Election Ballot Injection** | Contract verifies `block.timestamp < endTime` and `state == OPEN`. Any late transactions automatically revert. |
