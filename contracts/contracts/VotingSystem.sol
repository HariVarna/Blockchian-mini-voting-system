// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title VotingSystem
 * @notice Decentralized, secure, and privacy-preserving mini voting system smart contract.
 * @dev Enforces one-wallet-one-vote, on-chain ballot commitments, automated timestamp boundaries,
 * role/multisig governance, and verifiable result publication.
 */
contract VotingSystem is Pausable, ReentrancyGuard {
    enum ElectionState {
        NOT_CREATED,
        NOT_STARTED,
        OPEN,
        CLOSED,
        RESULTS_PUBLISHED,
        PAUSED
    }

    struct Candidate {
        uint256 candidateId;
        string metadataURI; // Off-chain / IPFS metadata reference
        bool isActive;
        bool exists;
    }

    struct Election {
        uint256 electionId;
        string title;
        string metadataURI;
        uint256 startTime;
        uint256 endTime;
        ElectionState explicitState;
        uint256 candidateCount;
        uint256 totalVotesCast;
        bytes32 resultHash;
        uint256 winnerCandidateId;
        bool isTie;
        bool exists;
    }

    address public admin;
    address public multisig;

    // electionId => Election
    mapping(uint256 => Election) public elections;

    // electionId => candidateId => Candidate
    mapping(uint256 => mapping(uint256 => Candidate)) public electionCandidates;

    // electionId => list of candidateIds
    mapping(uint256 => uint256[]) private _electionCandidateIds;

    // electionId => voter address => hasVoted
    mapping(uint256 => mapping(address => bool)) public hasVoted;

    // electionId => ballotCommitment => isUsed
    mapping(uint256 => mapping(bytes32 => bool)) public ballotCommitments;

    // Events
    event ElectionCreated(uint256 indexed electionId, string title, uint256 startTime, uint256 endTime);
    event CandidateAdded(uint256 indexed electionId, uint256 indexed candidateId, string metadataURI);
    event CandidateUpdated(uint256 indexed electionId, uint256 indexed candidateId, string metadataURI, bool isActive);
    event ElectionOpened(uint256 indexed electionId, uint256 timestamp);
    event ElectionClosed(uint256 indexed electionId, uint256 timestamp);
    event VoteCast(uint256 indexed electionId, address indexed voter, bytes32 indexed ballotCommitment, uint256 timestamp);
    event ResultsPublished(
        uint256 indexed electionId,
        bytes32 indexed resultHash,
        uint256 winnerCandidateId,
        bool isTie,
        uint256 totalVotes,
        uint256 timestamp
    );
    event EmergencyPaused(uint256 indexed electionId, address indexed trigger, uint256 timestamp);
    event EmergencyResumed(uint256 indexed electionId, address indexed trigger, uint256 timestamp);
    event AdminTransferred(address indexed previousAdmin, address indexed newAdmin);
    event MultisigUpdated(address indexed previousMultisig, address indexed newMultisig);

    modifier onlyAuthorized() {
        require(
            msg.sender == admin || (multisig != address(0) && msg.sender == multisig),
            "VotingSystem: caller is not admin or multisig"
        );
        _;
    }

    constructor(address _admin, address _multisig) {
        require(_admin != address(0), "VotingSystem: zero admin address");
        admin = _admin;
        multisig = _multisig;
    }

    function setMultisig(address _multisig) external {
        require(msg.sender == admin, "VotingSystem: only admin can set multisig");
        emit MultisigUpdated(multisig, _multisig);
        multisig = _multisig;
    }

    function transferAdmin(address _newAdmin) external {
        require(msg.sender == admin, "VotingSystem: only admin can transfer admin");
        require(_newAdmin != address(0), "VotingSystem: zero address");
        emit AdminTransferred(admin, _newAdmin);
        admin = _newAdmin;
    }

    /**
     * @notice Create a new election
     */
    function createElection(
        uint256 electionId,
        string calldata title,
        string calldata metadataURI,
        uint256 startTime,
        uint256 endTime
    ) external onlyAuthorized {
        require(electionId > 0, "VotingSystem: invalid election id");
        require(!elections[electionId].exists, "VotingSystem: election already exists");
        require(bytes(title).length > 0, "VotingSystem: empty title");
        require(startTime < endTime, "VotingSystem: start time must be before end time");
        require(endTime > block.timestamp, "VotingSystem: end time must be in future");

        Election storage e = elections[electionId];
        e.electionId = electionId;
        e.title = title;
        e.metadataURI = metadataURI;
        e.startTime = startTime;
        e.endTime = endTime;
        e.explicitState = ElectionState.NOT_STARTED;
        e.candidateCount = 0;
        e.totalVotesCast = 0;
        e.resultHash = bytes32(0);
        e.winnerCandidateId = 0;
        e.isTie = false;
        e.exists = true;

        emit ElectionCreated(electionId, title, startTime, endTime);
    }

    /**
     * @notice Add a candidate to an election
     */
    function addCandidate(
        uint256 electionId,
        uint256 candidateId,
        string calldata metadataURI
    ) external onlyAuthorized {
        Election storage e = elections[electionId];
        require(e.exists, "VotingSystem: election does not exist");
        require(
            e.explicitState == ElectionState.NOT_STARTED,
            "VotingSystem: candidates can only be added before election starts"
        );
        require(candidateId > 0, "VotingSystem: invalid candidate id");
        require(!electionCandidates[electionId][candidateId].exists, "VotingSystem: candidate already registered");

        Candidate storage c = electionCandidates[electionId][candidateId];
        c.candidateId = candidateId;
        c.metadataURI = metadataURI;
        c.isActive = true;
        c.exists = true;

        _electionCandidateIds[electionId].push(candidateId);
        e.candidateCount += 1;

        emit CandidateAdded(electionId, candidateId, metadataURI);
    }

    /**
     * @notice Update candidate metadata or status
     */
    function updateCandidate(
        uint256 electionId,
        uint256 candidateId,
        string calldata metadataURI,
        bool isActive
    ) external onlyAuthorized {
        require(elections[electionId].exists, "VotingSystem: election does not exist");
        require(electionCandidates[electionId][candidateId].exists, "VotingSystem: candidate does not exist");
        require(
            elections[electionId].explicitState == ElectionState.NOT_STARTED,
            "VotingSystem: cannot modify candidates after start"
        );

        Candidate storage c = electionCandidates[electionId][candidateId];
        c.metadataURI = metadataURI;
        c.isActive = isActive;

        emit CandidateUpdated(electionId, candidateId, metadataURI, isActive);
    }

    /**
     * @notice Open an election for voting
     */
    function openElection(uint256 electionId) external onlyAuthorized {
        Election storage e = elections[electionId];
        require(e.exists, "VotingSystem: election does not exist");
        require(e.explicitState == ElectionState.NOT_STARTED || e.explicitState == ElectionState.PAUSED, "VotingSystem: invalid state transition");
        require(block.timestamp >= e.startTime, "VotingSystem: start time not reached yet");
        require(block.timestamp < e.endTime, "VotingSystem: election end time has passed");
        require(e.candidateCount >= 2, "VotingSystem: need at least 2 candidates");

        e.explicitState = ElectionState.OPEN;
        emit ElectionOpened(electionId, block.timestamp);
    }

    /**
     * @notice Manually or formally close an election
     */
    function closeElection(uint256 electionId) external onlyAuthorized {
        Election storage e = elections[electionId];
        require(e.exists, "VotingSystem: election does not exist");
        require(e.explicitState == ElectionState.OPEN || e.explicitState == ElectionState.PAUSED, "VotingSystem: election not open or paused");

        e.explicitState = ElectionState.CLOSED;
        emit ElectionClosed(electionId, block.timestamp);
    }

    /**
     * @notice Emergency Pause voting for a specific election
     */
    function emergencyPause(uint256 electionId) external onlyAuthorized {
        Election storage e = elections[electionId];
        require(e.exists, "VotingSystem: election does not exist");
        require(e.explicitState == ElectionState.OPEN, "VotingSystem: election is not open");

        e.explicitState = ElectionState.PAUSED;
        _pause();

        emit EmergencyPaused(electionId, msg.sender, block.timestamp);
    }

    /**
     * @notice Resume paused election
     */
    function resume(uint256 electionId) external onlyAuthorized {
        Election storage e = elections[electionId];
        require(e.exists, "VotingSystem: election does not exist");
        require(e.explicitState == ElectionState.PAUSED, "VotingSystem: election is not paused");
        require(block.timestamp < e.endTime, "VotingSystem: election end time passed");

        e.explicitState = ElectionState.OPEN;
        _unpause();

        emit EmergencyResumed(electionId, msg.sender, block.timestamp);
    }

    /**
     * @notice Cast an encrypted vote commitment on-chain.
     * @param electionId ID of the active election
     * @param ballotCommitment Cryptographic hash of the encrypted ballot payload
     */
    function castVote(uint256 electionId, bytes32 ballotCommitment) external nonReentrant whenNotPaused {
        Election storage e = elections[electionId];
        require(e.exists, "VotingSystem: election does not exist");
        require(getElectionState(electionId) == ElectionState.OPEN, "VotingSystem: voting is not currently open");
        require(!hasVoted[electionId][msg.sender], "VotingSystem: wallet has already voted in this election");
        require(ballotCommitment != bytes32(0), "VotingSystem: invalid empty ballot commitment");
        require(!ballotCommitments[electionId][ballotCommitment], "VotingSystem: duplicate ballot commitment");

        hasVoted[electionId][msg.sender] = true;
        ballotCommitments[electionId][ballotCommitment] = true;
        e.totalVotesCast += 1;

        emit VoteCast(electionId, msg.sender, ballotCommitment, block.timestamp);
    }

    /**
     * @notice Publish final election results with cryptographic result hash
     */
    function publishResults(
        uint256 electionId,
        bytes32 resultHash,
        uint256 winnerCandidateId,
        bool isTie,
        uint256 totalVotes
    ) external onlyAuthorized {
        Election storage e = elections[electionId];
        require(e.exists, "VotingSystem: election does not exist");
        
        ElectionState currentState = getElectionState(electionId);
        require(
            currentState == ElectionState.CLOSED || e.explicitState == ElectionState.CLOSED,
            "VotingSystem: election must be closed before publishing results"
        );
        require(resultHash != bytes32(0), "VotingSystem: invalid result hash");
        require(totalVotes == e.totalVotesCast, "VotingSystem: total votes mismatch");
        if (!isTie) {
            require(electionCandidates[electionId][winnerCandidateId].exists, "VotingSystem: invalid winner candidate");
        }

        e.explicitState = ElectionState.RESULTS_PUBLISHED;
        e.resultHash = resultHash;
        e.winnerCandidateId = winnerCandidateId;
        e.isTie = isTie;

        emit ResultsPublished(
            electionId,
            resultHash,
            winnerCandidateId,
            isTie,
            totalVotes,
            block.timestamp
        );
    }

    /**
     * @notice Dynamically calculate current election state based on block.timestamp
     */
    function getElectionState(uint256 electionId) public view returns (ElectionState) {
        Election storage e = elections[electionId];
        if (!e.exists) {
            return ElectionState.NOT_CREATED;
        }
        if (e.explicitState == ElectionState.RESULTS_PUBLISHED) {
            return ElectionState.RESULTS_PUBLISHED;
        }
        if (e.explicitState == ElectionState.PAUSED) {
            return ElectionState.PAUSED;
        }
        if (e.explicitState == ElectionState.CLOSED) {
            return ElectionState.CLOSED;
        }
        if (e.explicitState == ElectionState.OPEN) {
            if (block.timestamp >= e.endTime) {
                return ElectionState.CLOSED;
            }
            return ElectionState.OPEN;
        }
        if (e.explicitState == ElectionState.NOT_STARTED) {
            if (block.timestamp >= e.endTime) {
                return ElectionState.CLOSED;
            }
            return ElectionState.NOT_STARTED;
        }
        return e.explicitState;
    }

    /**
     * @notice Check if a specific address has voted
     */
    function checkHasVoted(uint256 electionId, address voter) external view returns (bool) {
        return hasVoted[electionId][voter];
    }

    /**
     * @notice Fetch candidate IDs for an election
     */
    function getCandidateIds(uint256 electionId) external view returns (uint256[] memory) {
        return _electionCandidateIds[electionId];
    }

    /**
     * @notice Fetch details of a candidate
     */
    function getCandidate(uint256 electionId, uint256 candidateId) external view returns (
        uint256 id,
        string memory metadataURI,
        bool isActive,
        bool exists
    ) {
        Candidate storage c = electionCandidates[electionId][candidateId];
        return (c.candidateId, c.metadataURI, c.isActive, c.exists);
    }

    /**
     * @notice Fetch full details of an election
     */
    function getElectionDetails(uint256 electionId) external view returns (
        uint256 id,
        string memory title,
        string memory metadataURI,
        uint256 startTime,
        uint256 endTime,
        ElectionState state,
        uint256 candidateCount,
        uint256 totalVotesCast,
        bytes32 resultHash,
        uint256 winnerCandidateId,
        bool isTie
    ) {
        Election storage e = elections[electionId];
        return (
            e.electionId,
            e.title,
            e.metadataURI,
            e.startTime,
            e.endTime,
            getElectionState(electionId),
            e.candidateCount,
            e.totalVotesCast,
            e.resultHash,
            e.winnerCandidateId,
            e.isTie
        );
    }
}
