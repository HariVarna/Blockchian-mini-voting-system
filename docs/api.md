# Backend REST API Specification

Base URL: `http://localhost:5001/api`

---

## 1. Authentication & OTP
- `POST /auth/request-otp`
  - **Body**: `{ "email": "voter@example.com" }`
  - **Response 200**: `{ "message": "OTP sent successfully to your email address.", "devOtpPreview": "123456" }`
  - **Error 429**: Rate limited cooldown.
- `POST /auth/verify-otp`
  - **Body**: `{ "email": "voter@example.com", "otp": "123456" }`
  - **Response 200**: `{ "success": true, "message": "OTP verified successfully." }`

---

## 2. Voter Management
- `POST /voter/register`
  - **Body**: `{ "walletAddress": "0x7099...c8", "name": "Alice Vance", "email": "alice@example.com", "otp": "123456" }`
  - **Response 200**: `{ "success": true, "user": { ... } }`
- `GET /voter/status/:walletAddress`
  - **Response 200**: `{ "verified": true, "walletAddress": "0x7099...", "name": "Alice Vance", "email": "alice@example.com" }`

---

## 3. Election & Candidates
- `GET /election/current`
  - **Response 200**: Full details of the active election, candidates, and synced on-chain state.
- `POST /election`
  - **Body**: `{ "blockchainElectionId": 1, "title": "2026 Election", "description": "...", "startTime": "...", "endTime": "..." }`
- `GET /candidates?electionId=...`
  - **Response 200**: Array of candidate objects.
- `POST /candidates`
  - **Body**: `{ "electionId": "uuid", "blockchainCandidateId": 1, "name": "...", "party": "...", "imageUrl": "...", "slogan": "...", "policyStatement": "..." }`

---

## 4. Ballots & Privacy
- `POST /ballots/prepare`
  - **Body**: `{ "electionId": "uuid", "candidateId": 1, "walletAddress": "0x...", "otp": "123456" }`
  - **Response 200**: `{ "encryptedVote": "iv:tag:ciphertext", "ballotCommitment": "0xkeccak256..." }`
- `POST /ballots/submit`
  - **Body**: `{ "electionId": "uuid", "walletAddress": "0x...", "encryptedVote": "...", "ballotCommitment": "0x...", "txHash": "0x..." }`
- `GET /ballots/status/:walletAddress`
  - **Response 200**: `{ "hasVoted": true, "ballot": { ... } }`

---

## 5. Results & Multisig Governance
- `POST /results/tally`
  - **Body**: `{ "electionId": "uuid" }`
  - **Response 200**: `{ "winnerCandidateId": 1, "isTie": false, "totalVotes": 42, "resultHash": "0x..." }`
- `POST /results/publish`
  - **Body**: `{ "electionId": "uuid", "resultHash": "0x...", "winnerCandidateId": 1, "isTie": false, "totalVotes": 42, "txHash": "0x..." }`
- `GET /admin/approvals`
  - **Response 200**: Array of 2-of-3 multisig proposals.
- `POST /admin/approvals/propose`
  - **Body**: `{ "proposalId": 1, "actionType": "OPEN_ELECTION", "targetElectionId": 1, ... }`
- `POST /admin/approvals/sign`
  - **Body**: `{ "proposalId": 1, "adminAddress": "0x..." }`
