# Smart Contract Specification

The smart contracts are written in Solidity `0.8.24` and utilize OpenZeppelin v5 libraries (`Pausable`, `ReentrancyGuard`).

---

## 1. Contracts

### 1.1 `VotingSystem.sol`

Main contract managing election lifecycle, candidate registration, one-wallet-one-vote enforcement, ballot commitment recording, emergency pausing, and result publication.

#### State Machine:
- `NOT_CREATED` (0)
- `NOT_STARTED` (1)
- `OPEN` (2)
- `CLOSED` (3)
- `RESULTS_PUBLISHED` (4)
- `PAUSED` (5)

#### Key Functions:
```solidity
function createElection(uint256 electionId, string calldata title, string calldata metadataURI, uint256 startTime, uint256 endTime) external;
function addCandidate(uint256 electionId, uint256 candidateId, string calldata metadataURI) external;
function updateCandidate(uint256 electionId, uint256 candidateId, string calldata metadataURI, bool isActive) external;
function openElection(uint256 electionId) external;
function closeElection(uint256 electionId) external;
function emergencyPause(uint256 electionId) external;
function resume(uint256 electionId) external;
function castVote(uint256 electionId, bytes32 ballotCommitment) external nonReentrant whenNotPaused;
function publishResults(uint256 electionId, bytes32 resultHash, uint256 winnerCandidateId, bool isTie, uint256 totalVotes) external;
function getElectionState(uint256 electionId) public view returns (ElectionState);
function checkHasVoted(uint256 electionId, address voter) external view returns (bool);
function getElectionDetails(uint256 electionId) external view returns (...);
```

#### Events Emitted:
```solidity
event ElectionCreated(uint256 indexed electionId, string title, uint256 startTime, uint256 endTime);
event CandidateAdded(uint256 indexed electionId, uint256 indexed candidateId, string metadataURI);
event CandidateUpdated(uint256 indexed electionId, uint256 indexed candidateId, string metadataURI, bool isActive);
event ElectionOpened(uint256 indexed electionId, uint256 timestamp);
event ElectionClosed(uint256 indexed electionId, uint256 timestamp);
event VoteCast(uint256 indexed electionId, address indexed voter, bytes32 indexed ballotCommitment, uint256 timestamp);
event ResultsPublished(uint256 indexed electionId, bytes32 indexed resultHash, uint256 winnerCandidateId, bool isTie, uint256 totalVotes, uint256 timestamp);
event EmergencyPaused(uint256 indexed electionId, address indexed trigger, uint256 timestamp);
event EmergencyResumed(uint256 indexed electionId, address indexed trigger, uint256 timestamp);
```

---

### 1.2 `AdminMultisig.sol`

2-of-3 Multi-Signature authorization contract.

#### Key Functions:
```solidity
function createProposal(address targetContract, bytes calldata data, string calldata description) external returns (uint256);
function approveProposal(uint256 proposalId) external;
function executeProposal(uint256 proposalId) external returns (bytes memory);
function cancelProposal(uint256 proposalId) external;
function getProposal(uint256 proposalId) external view returns (...);
```

---

## 2. Gas Optimization Techniques
- Off-chain storage of candidate images, slogans, policy statements, and plaintext voter data. Only compact URI hashes (`string`) and commitments (`bytes32`) stored on-chain.
- Packed structs and indexed event filtering for low query gas costs.
- Solidity `viaIR` optimizer configured with 200 runs.
