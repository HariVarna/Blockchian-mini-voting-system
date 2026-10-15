# Privacy Architecture & Cryptographic Commitments

## 1. The Myth of "Blockchain = Automatic Privacy"

A common misconception in decentralized applications is that storing a vote on a public blockchain guarantees voter privacy. In reality:
- **Public Blockchains are Transparent**: Every transaction payload, wallet address, block timestamp, and event parameter is publicly readable by anyone running a node or block explorer.
- **Putting plaintext candidate choices on-chain destroys ballot secrecy** and allows vote buying, voter coercion, and real-time partial tally manipulation.

---

## 2. VoteSphere's Privacy-Preserving Architecture

To resolve this challenge while preserving decentralized auditability, VoteSphere employs a **hybrid cryptographic commitment scheme**:

```
[Voter Choice] + [Random Salt] + [Timestamp]
                   │
                   ▼ (AES-256-GCM Encryption)
        [Encrypted Ciphertext]
                   │
         ┌─────────┴─────────┐
         ▼                   ▼
(Stored Off-Chain)    (Keccak-256 Hash)
         │                   │
         │                   ▼ (Committed On-Chain)
         │           `castVote(electionId, ballotCommitment)`
         │                   │
         └─────────┬─────────┘
                   ▼
     (Admin Decryption & Tally at Election Close)
                   │
                   ▼
  `publishResults(electionId, resultHash, winnerId, isTie, totalVotes)`
```

### Key Principles:
1. **No PII On-Chain**: Personal identification data (voter legal name, email address, phone numbers, OTP secrets) are strictly prohibited from smart contract transactions and events.
2. **Encrypted Ballot Payloads**: The ballot is encrypted client-side using authenticated encryption (AES-256-GCM) with an initialization vector (IV) and authentication tag.
3. **Immutable Cryptographic Commitment**: Only the hash commitment $C = \text{Keccak256}(\text{EncryptedPayload})$ is recorded in the Ethereum smart contract.
4. **Verifiable Result Hash**: Upon election closing, the aggregate candidate vote counts are serialized deterministically and hashed $R = \text{Keccak256}(\text{SortedTallies})$ to be committed permanently on-chain. Anyone with access to the decrypted ballot dataset can verify that the tally matches the published result hash.
