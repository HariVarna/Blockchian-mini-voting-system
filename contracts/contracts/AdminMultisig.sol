// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/**
 * @title AdminMultisig
 * @dev 2-of-3 Multi-Signature authorization contract for critical election actions.
 */
contract AdminMultisig {
    address[3] public admins;
    uint256 public constant REQUIRED_APPROVALS = 2;

    struct Proposal {
        uint256 id;
        address targetContract;
        bytes data;
        string description;
        uint256 approvalCount;
        bool executed;
        bool cancelled;
        uint256 createdAt;
    }

    uint256 public proposalCounter;
    mapping(uint256 => Proposal) public proposals;
    mapping(uint256 => mapping(address => bool)) public hasApproved;

    event ProposalCreated(uint256 indexed proposalId, address indexed proposer, address targetContract, string description);
    event ProposalApproved(uint256 indexed proposalId, address indexed admin);
    event ProposalExecuted(uint256 indexed proposalId, address indexed executor);
    event ProposalCancelled(uint256 indexed proposalId, address indexed admin);
    event AdminReplaced(address indexed oldAdmin, address indexed newAdmin);

    modifier onlyAdmin() {
        require(isAdmin(msg.sender), "AdminMultisig: caller is not an admin");
        _;
    }

    constructor(address[3] memory _admins) {
        require(_admins[0] != address(0) && _admins[1] != address(0) && _admins[2] != address(0), "AdminMultisig: zero address admin");
        require(_admins[0] != _admins[1] && _admins[1] != _admins[2] && _admins[0] != _admins[2], "AdminMultisig: duplicate admins");
        admins = _admins;
    }

    function isAdmin(address account) public view returns (bool) {
        return (account == admins[0] || account == admins[1] || account == admins[2]);
    }

    function getAdmins() external view returns (address[3] memory) {
        return admins;
    }

    function createProposal(
        address targetContract,
        bytes calldata data,
        string calldata description
    ) external onlyAdmin returns (uint256) {
        require(targetContract != address(0), "AdminMultisig: zero target address");

        uint256 proposalId = ++proposalCounter;
        Proposal storage p = proposals[proposalId];
        p.id = proposalId;
        p.targetContract = targetContract;
        p.data = data;
        p.description = description;
        p.approvalCount = 1;
        p.executed = false;
        p.cancelled = false;
        p.createdAt = block.timestamp;

        hasApproved[proposalId][msg.sender] = true;

        emit ProposalCreated(proposalId, msg.sender, targetContract, description);
        emit ProposalApproved(proposalId, msg.sender);

        return proposalId;
    }

    function approveProposal(uint256 proposalId) external onlyAdmin {
        Proposal storage p = proposals[proposalId];
        require(p.id != 0, "AdminMultisig: proposal does not exist");
        require(!p.executed, "AdminMultisig: proposal already executed");
        require(!p.cancelled, "AdminMultisig: proposal is cancelled");
        require(!hasApproved[proposalId][msg.sender], "AdminMultisig: already approved");

        hasApproved[proposalId][msg.sender] = true;
        p.approvalCount += 1;

        emit ProposalApproved(proposalId, msg.sender);
    }

    function executeProposal(uint256 proposalId) external onlyAdmin returns (bytes memory) {
        Proposal storage p = proposals[proposalId];
        require(p.id != 0, "AdminMultisig: proposal does not exist");
        require(!p.executed, "AdminMultisig: proposal already executed");
        require(!p.cancelled, "AdminMultisig: proposal is cancelled");
        require(p.approvalCount >= REQUIRED_APPROVALS, "AdminMultisig: insufficient approvals");

        p.executed = true;

        (bool success, bytes memory returnData) = p.targetContract.call(p.data);
        require(success, "AdminMultisig: execution failed");

        emit ProposalExecuted(proposalId, msg.sender);
        return returnData;
    }

    function cancelProposal(uint256 proposalId) external onlyAdmin {
        Proposal storage p = proposals[proposalId];
        require(p.id != 0, "AdminMultisig: proposal does not exist");
        require(!p.executed, "AdminMultisig: proposal already executed");
        require(!p.cancelled, "AdminMultisig: proposal already cancelled");

        p.cancelled = true;
        emit ProposalCancelled(proposalId, msg.sender);
    }

    function getProposal(uint256 proposalId) external view returns (
        uint256 id,
        address targetContract,
        bytes memory data,
        string memory description,
        uint256 approvalCount,
        bool executed,
        bool cancelled,
        uint256 createdAt
    ) {
        Proposal storage p = proposals[proposalId];
        return (
            p.id,
            p.targetContract,
            p.data,
            p.description,
            p.approvalCount,
            p.executed,
            p.cancelled,
            p.createdAt
        );
    }
}
