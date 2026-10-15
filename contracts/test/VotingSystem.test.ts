import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import { VotingSystem, AdminMultisig } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("Blockchain Mini Voting System & AdminMultisig Test Suite", function () {
  let votingSystem: VotingSystem;
  let adminMultisig: AdminMultisig;
  let owner: SignerWithAddress;
  let admin1: SignerWithAddress;
  let admin2: SignerWithAddress;
  let admin3: SignerWithAddress;
  let voter1: SignerWithAddress;
  let voter2: SignerWithAddress;
  let voter3: SignerWithAddress;
  let unauthorized: SignerWithAddress;

  const ELECTION_ID = 1;
  const TITLE = "Presidential Election 2026";
  const METADATA_URI = "ipfs://QmElectionMeta123";

  beforeEach(async function () {
    [owner, admin1, admin2, admin3, voter1, voter2, voter3, unauthorized] = await ethers.getSigners();

    // Deploy 2-of-3 Multisig
    const AdminMultisigFactory = await ethers.getContractFactory("AdminMultisig");
    adminMultisig = await AdminMultisigFactory.deploy([admin1.address, admin2.address, admin3.address]);
    await adminMultisig.waitForDeployment();

    // Deploy VotingSystem
    const VotingSystemFactory = await ethers.getContractFactory("VotingSystem");
    votingSystem = await VotingSystemFactory.deploy(owner.address, await adminMultisig.getAddress());
    await votingSystem.waitForDeployment();
  });

  describe("1. Deployment & Access Control", function () {
    it("should initialize with correct admin and multisig addresses", async function () {
      expect(await votingSystem.admin()).to.equal(owner.address);
      expect(await votingSystem.multisig()).to.equal(await adminMultisig.getAddress());
    });

    it("should allow only admin to transfer admin or set multisig", async function () {
      await expect(
        votingSystem.connect(unauthorized).transferAdmin(unauthorized.address)
      ).to.be.revertedWith("VotingSystem: only admin can transfer admin");

      await expect(
        votingSystem.connect(unauthorized).setMultisig(unauthorized.address)
      ).to.be.revertedWith("VotingSystem: only admin can set multisig");

      await votingSystem.connect(owner).transferAdmin(admin1.address);
      expect(await votingSystem.admin()).to.equal(admin1.address);
    });
  });

  describe("2. Election Creation & Lifecycle Validation", function () {
    it("should create an election with valid parameters", async function () {
      const now = await time.latest();
      const startTime = now + 100;
      const endTime = now + 3600;

      await expect(
        votingSystem.connect(owner).createElection(ELECTION_ID, TITLE, METADATA_URI, startTime, endTime)
      )
        .to.emit(votingSystem, "ElectionCreated")
        .withArgs(ELECTION_ID, TITLE, startTime, endTime);

      const details = await votingSystem.getElectionDetails(ELECTION_ID);
      expect(details.id).to.equal(ELECTION_ID);
      expect(details.title).to.equal(TITLE);
      expect(details.state).to.equal(1); // NOT_STARTED
    });

    it("should reject invalid election times (start >= end or end in past)", async function () {
      const now = await time.latest();
      await expect(
        votingSystem.connect(owner).createElection(ELECTION_ID, TITLE, METADATA_URI, now + 500, now + 100)
      ).to.be.revertedWith("VotingSystem: start time must be before end time");

      await expect(
        votingSystem.connect(owner).createElection(ELECTION_ID, TITLE, METADATA_URI, now - 500, now - 100)
      ).to.be.revertedWith("VotingSystem: end time must be in future");
    });

    it("should prevent duplicate election IDs", async function () {
      const now = await time.latest();
      await votingSystem.connect(owner).createElection(ELECTION_ID, TITLE, METADATA_URI, now + 100, now + 3600);

      await expect(
        votingSystem.connect(owner).createElection(ELECTION_ID, TITLE, METADATA_URI, now + 100, now + 3600)
      ).to.be.revertedWith("VotingSystem: election already exists");
    });
  });

  describe("3. Candidate Management", function () {
    beforeEach(async function () {
      const now = await time.latest();
      await votingSystem.connect(owner).createElection(ELECTION_ID, TITLE, METADATA_URI, now + 100, now + 3600);
    });

    it("should add candidates and emit CandidateAdded event", async function () {
      await expect(votingSystem.connect(owner).addCandidate(ELECTION_ID, 1, "ipfs://candidate1"))
        .to.emit(votingSystem, "CandidateAdded")
        .withArgs(ELECTION_ID, 1, "ipfs://candidate1");

      await votingSystem.connect(owner).addCandidate(ELECTION_ID, 2, "ipfs://candidate2");

      const candidateIds = await votingSystem.getCandidateIds(ELECTION_ID);
      expect(candidateIds.length).to.equal(2);
      expect(candidateIds[0]).to.equal(1);
      expect(candidateIds[1]).to.equal(2);
    });

    it("should prevent duplicate candidate IDs", async function () {
      await votingSystem.connect(owner).addCandidate(ELECTION_ID, 1, "ipfs://candidate1");
      await expect(
        votingSystem.connect(owner).addCandidate(ELECTION_ID, 1, "ipfs://candidate1_dup")
      ).to.be.revertedWith("VotingSystem: candidate already registered");
    });

    it("should allow updating candidate before election start", async function () {
      await votingSystem.connect(owner).addCandidate(ELECTION_ID, 1, "ipfs://candidate1");
      await expect(votingSystem.connect(owner).updateCandidate(ELECTION_ID, 1, "ipfs://candidate1_updated", true))
        .to.emit(votingSystem, "CandidateUpdated")
        .withArgs(ELECTION_ID, 1, "ipfs://candidate1_updated", true);

      const candidate = await votingSystem.getCandidate(ELECTION_ID, 1);
      expect(candidate.metadataURI).to.equal("ipfs://candidate1_updated");
    });
  });

  describe("4. Voting Flow & One-Vote Enforcement", function () {
    let startTime: number;
    let endTime: number;

    beforeEach(async function () {
      const now = await time.latest();
      startTime = now + 100;
      endTime = now + 3600;

      await votingSystem.connect(owner).createElection(ELECTION_ID, TITLE, METADATA_URI, startTime, endTime);
      await votingSystem.connect(owner).addCandidate(ELECTION_ID, 1, "ipfs://c1");
      await votingSystem.connect(owner).addCandidate(ELECTION_ID, 2, "ipfs://c2");
    });

    it("should reject voting before election is opened", async function () {
      const commitment = ethers.keccak256(ethers.toUtf8Bytes("ballot_voter1"));
      await expect(
        votingSystem.connect(voter1).castVote(ELECTION_ID, commitment)
      ).to.be.revertedWith("VotingSystem: voting is not currently open");
    });

    it("should open election when start time is reached", async function () {
      await time.increaseTo(startTime + 1);
      await expect(votingSystem.connect(owner).openElection(ELECTION_ID))
        .to.emit(votingSystem, "ElectionOpened");

      const state = await votingSystem.getElectionState(ELECTION_ID);
      expect(state).to.equal(2); // OPEN
    });

    it("should accept valid vote and record commitment", async function () {
      await time.increaseTo(startTime + 1);
      await votingSystem.connect(owner).openElection(ELECTION_ID);

      const commitment1 = ethers.keccak256(ethers.toUtf8Bytes("encrypted_ballot_voter1_candidate1"));

      await expect(votingSystem.connect(voter1).castVote(ELECTION_ID, commitment1))
        .to.emit(votingSystem, "VoteCast")
        .withArgs(ELECTION_ID, voter1.address, commitment1, await time.latest() + 1);

      expect(await votingSystem.checkHasVoted(ELECTION_ID, voter1.address)).to.be.true;
      const details = await votingSystem.getElectionDetails(ELECTION_ID);
      expect(details.totalVotesCast).to.equal(1);
    });

    it("should strictly reject duplicate vote from same wallet", async function () {
      await time.increaseTo(startTime + 1);
      await votingSystem.connect(owner).openElection(ELECTION_ID);

      const commitment1 = ethers.keccak256(ethers.toUtf8Bytes("encrypted_ballot_voter1_1"));
      await votingSystem.connect(voter1).castVote(ELECTION_ID, commitment1);

      const commitment2 = ethers.keccak256(ethers.toUtf8Bytes("encrypted_ballot_voter1_2"));
      await expect(
        votingSystem.connect(voter1).castVote(ELECTION_ID, commitment2)
      ).to.be.revertedWith("VotingSystem: wallet has already voted in this election");
    });

    it("should reject votes when election endTime passes automatically", async function () {
      await time.increaseTo(startTime + 1);
      await votingSystem.connect(owner).openElection(ELECTION_ID);

      // Fast forward past endTime
      await time.increaseTo(endTime + 10);

      const dynamicState = await votingSystem.getElectionState(ELECTION_ID);
      expect(dynamicState).to.equal(3); // CLOSED

      const commitment = ethers.keccak256(ethers.toUtf8Bytes("encrypted_ballot_late"));
      await expect(
        votingSystem.connect(voter2).castVote(ELECTION_ID, commitment)
      ).to.be.revertedWith("VotingSystem: voting is not currently open");
    });
  });

  describe("5. Emergency Pause & Resume", function () {
    beforeEach(async function () {
      const now = await time.latest();
      const startTime = now + 50;
      const endTime = now + 3600;

      await votingSystem.connect(owner).createElection(ELECTION_ID, TITLE, METADATA_URI, startTime, endTime);
      await votingSystem.connect(owner).addCandidate(ELECTION_ID, 1, "ipfs://c1");
      await votingSystem.connect(owner).addCandidate(ELECTION_ID, 2, "ipfs://c2");
      await time.increaseTo(startTime + 1);
      await votingSystem.connect(owner).openElection(ELECTION_ID);
    });

    it("should pause and resume voting properly", async function () {
      await expect(votingSystem.connect(owner).emergencyPause(ELECTION_ID))
        .to.emit(votingSystem, "EmergencyPaused");

      expect(await votingSystem.getElectionState(ELECTION_ID)).to.equal(5); // PAUSED

      const commitment = ethers.keccak256(ethers.toUtf8Bytes("ballot_during_pause"));
      await expect(
        votingSystem.connect(voter1).castVote(ELECTION_ID, commitment)
      ).to.be.revertedWithCustomError(votingSystem, "EnforcedPause");

      await expect(votingSystem.connect(owner).resume(ELECTION_ID))
        .to.emit(votingSystem, "EmergencyResumed");

      expect(await votingSystem.getElectionState(ELECTION_ID)).to.equal(2); // OPEN

      // Now voting succeeds
      await expect(votingSystem.connect(voter1).castVote(ELECTION_ID, commitment)).to.emit(votingSystem, "VoteCast");
    });
  });

  describe("6. 2-of-3 Multisig Governance", function () {
    let startTime: number;
    let endTime: number;

    beforeEach(async function () {
      const now = await time.latest();
      startTime = now + 50;
      endTime = now + 3600;

      await votingSystem.connect(owner).createElection(ELECTION_ID, TITLE, METADATA_URI, startTime, endTime);
      await votingSystem.connect(owner).addCandidate(ELECTION_ID, 1, "ipfs://c1");
      await votingSystem.connect(owner).addCandidate(ELECTION_ID, 2, "ipfs://c2");
      await time.increaseTo(startTime + 1);
    });

    it("should require 2 admin approvals to execute critical action on VotingSystem", async function () {
      const openElectionCalldata = votingSystem.interface.encodeFunctionData("openElection", [ELECTION_ID]);

      // Admin 1 creates proposal
      const tx = await adminMultisig.connect(admin1).createProposal(
        await votingSystem.getAddress(),
        openElectionCalldata,
        "Open Election 1"
      );
      await tx.wait();

      const proposal = await adminMultisig.getProposal(1);
      expect(proposal.approvalCount).to.equal(1);
      expect(proposal.executed).to.be.false;

      // Executing with 1 approval should fail
      await expect(
        adminMultisig.connect(admin1).executeProposal(1)
      ).to.be.revertedWith("AdminMultisig: insufficient approvals");

      // Admin 2 approves
      await expect(adminMultisig.connect(admin2).approveProposal(1))
        .to.emit(adminMultisig, "ProposalApproved")
        .withArgs(1, admin2.address);

      // Now execution succeeds
      await expect(adminMultisig.connect(admin2).executeProposal(1))
        .to.emit(adminMultisig, "ProposalExecuted")
        .withArgs(1, admin2.address);

      expect(await votingSystem.getElectionState(ELECTION_ID)).to.equal(2); // OPEN
    });
  });

  describe("7. Result Management & Publication", function () {
    beforeEach(async function () {
      const now = await time.latest();
      const startTime = now + 50;
      const endTime = now + 3600;

      await votingSystem.connect(owner).createElection(ELECTION_ID, TITLE, METADATA_URI, startTime, endTime);
      await votingSystem.connect(owner).addCandidate(ELECTION_ID, 1, "ipfs://c1");
      await votingSystem.connect(owner).addCandidate(ELECTION_ID, 2, "ipfs://c2");
      await time.increaseTo(startTime + 1);
      await votingSystem.connect(owner).openElection(ELECTION_ID);

      // Cast 2 votes
      await votingSystem.connect(voter1).castVote(ELECTION_ID, ethers.keccak256(ethers.toUtf8Bytes("b1")));
      await votingSystem.connect(voter2).castVote(ELECTION_ID, ethers.keccak256(ethers.toUtf8Bytes("b2")));

      // Close election
      await votingSystem.connect(owner).closeElection(ELECTION_ID);
    });

    it("should publish verified results with result hash and winner", async function () {
      const resultHash = ethers.keccak256(ethers.toUtf8Bytes("candidate1:2,candidate2:0"));

      await expect(
        votingSystem.connect(owner).publishResults(ELECTION_ID, resultHash, 1, false, 2)
      )
        .to.emit(votingSystem, "ResultsPublished")
        .withArgs(ELECTION_ID, resultHash, 1, false, 2, await time.latest() + 1);

      const details = await votingSystem.getElectionDetails(ELECTION_ID);
      expect(details.state).to.equal(4); // RESULTS_PUBLISHED
      expect(details.resultHash).to.equal(resultHash);
      expect(details.winnerCandidateId).to.equal(1);
      expect(details.isTie).to.be.false;
    });

    it("should record tie result status properly", async function () {
      const tieResultHash = ethers.keccak256(ethers.toUtf8Bytes("candidate1:1,candidate2:1"));

      await votingSystem.connect(owner).publishResults(ELECTION_ID, tieResultHash, 0, true, 2);

      const details = await votingSystem.getElectionDetails(ELECTION_ID);
      expect(details.isTie).to.be.true;
      expect(details.winnerCandidateId).to.equal(0);
    });
  });
});
