// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title PACTEscrow
 * @notice Persistent Agent Commitment Tracker (PACT) - Milestone Escrow Primitive
 * @dev Enforces multi-milestone payment disbursement on Base Sepolia based on persistent reputation.
 *      Uses native ETH for transparent, minimal-overhead agent escrow.
 */
contract PACTEscrow {
    enum EscrowStatus {
        CREATED,
        FUNDED,
        COMPLETED,
        DISPUTED
    }

    struct Escrow {
        uint256 id;
        address payable payer;
        address payable beneficiary;
        uint256 totalAmount;
        uint256 releasedAmount;
        uint256 milestoneCount;
        uint256[] milestoneAmounts;
        bool[] milestoneReleased;
        EscrowStatus status;
        string commitmentId;
        string counterpartyName;
    }

    // Storage
    uint256 private _escrowIdCounter;
    mapping(uint256 => Escrow) private _escrows;

    // Mutex for reentrancy protection
    uint256 private constant _NOT_ENTERED = 1;
    uint256 private constant _ENTERED = 2;
    uint256 private _status = _NOT_ENTERED;

    modifier nonReentrant() {
        require(_status != _ENTERED, "ReentrancyGuard: reentrant call");
        _status = _ENTERED;
        _;
        _status = _NOT_ENTERED;
    }

    // Custom Errors
    error ZeroAddress();
    error ZeroMilestones();
    error ZeroAmount();
    error InvalidFundingAmount(uint256 expected, uint256 received);
    error Unauthorized(address caller);
    error InvalidEscrowStatus(EscrowStatus current, EscrowStatus expected);
    error InvalidMilestoneIndex(uint256 index, uint256 max);
    error MilestoneAlreadyReleased(uint256 index);
    error TransferFailed();

    // Events
    event EscrowCreated(
        uint256 indexed escrowId,
        address indexed payer,
        address indexed beneficiary,
        uint256 totalAmount,
        uint256 milestoneCount,
        string commitmentId
    );

    event EscrowFunded(
        uint256 indexed escrowId,
        address indexed payer,
        uint256 amount
    );

    event MilestoneReleased(
        uint256 indexed escrowId,
        uint256 indexed milestoneIndex,
        uint256 amount,
        address indexed beneficiary
    );

    event EscrowDisputed(
        uint256 indexed escrowId,
        address indexed caller,
        string reason
    );

    /**
     * @notice Creates an escrow agreement with specified milestone amounts.
     * @param beneficiary The counterparty agent wallet address to receive funds upon milestone release.
     * @param milestoneAmounts Array of ETH amounts for each milestone disbursement.
     * @param commitmentId The off-chain PACT commitment ID tracked in Sibyl Memory.
     * @param counterpartyName The human-readable name of the counterparty agent.
     * @return escrowId The unique sequential ID of the created escrow.
     */
    function createEscrow(
        address payable beneficiary,
        uint256[] calldata milestoneAmounts,
        string calldata commitmentId,
        string calldata counterpartyName
    ) external payable returns (uint256 escrowId) {
        if (beneficiary == address(0)) revert ZeroAddress();
        if (milestoneAmounts.length == 0) revert ZeroMilestones();

        uint256 total = 0;
        for (uint256 i = 0; i < milestoneAmounts.length; i++) {
            if (milestoneAmounts[i] == 0) revert ZeroAmount();
            total += milestoneAmounts[i];
        }

        if (total == 0) revert ZeroAmount();

        _escrowIdCounter++;
        escrowId = _escrowIdCounter;

        Escrow storage e = _escrows[escrowId];
        e.id = escrowId;
        e.payer = payable(msg.sender);
        e.beneficiary = beneficiary;
        e.totalAmount = total;
        e.releasedAmount = 0;
        e.milestoneCount = milestoneAmounts.length;
        e.milestoneAmounts = milestoneAmounts;
        e.milestoneReleased = new bool[](milestoneAmounts.length);
        e.commitmentId = commitmentId;
        e.counterpartyName = counterpartyName;

        if (msg.value > 0) {
            if (msg.value != total) {
                revert InvalidFundingAmount(total, msg.value);
            }
            e.status = EscrowStatus.FUNDED;
            emit EscrowFunded(escrowId, msg.sender, msg.value);
        } else {
            e.status = EscrowStatus.CREATED;
        }

        emit EscrowCreated(
            escrowId,
            msg.sender,
            beneficiary,
            total,
            milestoneAmounts.length,
            commitmentId
        );
    }

    /**
     * @notice Funds an existing created escrow with the required total amount.
     * @param escrowId ID of the escrow to fund.
     */
    function fundEscrow(uint256 escrowId) external payable {
        Escrow storage e = _escrows[escrowId];
        if (e.payer != msg.sender) revert Unauthorized(msg.sender);
        if (e.status != EscrowStatus.CREATED) {
            revert InvalidEscrowStatus(e.status, EscrowStatus.CREATED);
        }
        if (msg.value != e.totalAmount) {
            revert InvalidFundingAmount(e.totalAmount, msg.value);
        }

        e.status = EscrowStatus.FUNDED;
        emit EscrowFunded(escrowId, msg.sender, msg.value);
    }

    /**
     * @notice Releases payment for a completed milestone to the beneficiary agent.
     * @param escrowId The ID of the escrow.
     * @param milestoneIndex Index of the milestone to release (0-indexed).
     */
    function releaseMilestone(
        uint256 escrowId,
        uint256 milestoneIndex
    ) external nonReentrant {
        Escrow storage e = _escrows[escrowId];
        if (e.payer != msg.sender) revert Unauthorized(msg.sender);
        if (e.status != EscrowStatus.FUNDED) {
            revert InvalidEscrowStatus(e.status, EscrowStatus.FUNDED);
        }
        if (milestoneIndex >= e.milestoneCount) {
            revert InvalidMilestoneIndex(milestoneIndex, e.milestoneCount);
        }
        if (e.milestoneReleased[milestoneIndex]) {
            revert MilestoneAlreadyReleased(milestoneIndex);
        }

        uint256 amount = e.milestoneAmounts[milestoneIndex];

        // Effects (before interactions)
        e.milestoneReleased[milestoneIndex] = true;
        e.releasedAmount += amount;

        if (e.releasedAmount == e.totalAmount) {
            e.status = EscrowStatus.COMPLETED;
        }

        emit MilestoneReleased(escrowId, milestoneIndex, amount, e.beneficiary);

        // Interaction
        (bool success, ) = e.beneficiary.call{value: amount}("");
        if (!success) revert TransferFailed();
    }

    /**
     * @notice Marks an escrow as disputed.
     * @param escrowId The ID of the escrow to dispute.
     * @param reason The reason for the dispute.
     */
    function disputeEscrow(
        uint256 escrowId,
        string calldata reason
    ) external {
        Escrow storage e = _escrows[escrowId];
        if (msg.sender != e.payer && msg.sender != e.beneficiary) {
            revert Unauthorized(msg.sender);
        }
        if (e.status != EscrowStatus.FUNDED) {
            revert InvalidEscrowStatus(e.status, EscrowStatus.FUNDED);
        }

        e.status = EscrowStatus.DISPUTED;
        emit EscrowDisputed(escrowId, msg.sender, reason);
    }

    /**
     * @notice Retrieves detailed information about an escrow.
     */
    function getEscrow(
        uint256 escrowId
    )
        external
        view
        returns (
            uint256 id,
            address payer,
            address beneficiary,
            uint256 totalAmount,
            uint256 releasedAmount,
            uint256 milestoneCount,
            EscrowStatus status,
            string memory commitmentId,
            string memory counterpartyName
        )
    {
        Escrow storage e = _escrows[escrowId];
        return (
            e.id,
            e.payer,
            e.beneficiary,
            e.totalAmount,
            e.releasedAmount,
            e.milestoneCount,
            e.status,
            e.commitmentId,
            e.counterpartyName
        );
    }

    /**
     * @notice Retrieves the milestone amounts and release status flags for an escrow.
     */
    function getMilestones(
        uint256 escrowId
    )
        external
        view
        returns (
            uint256[] memory amounts,
            bool[] memory released
        )
    {
        Escrow storage e = _escrows[escrowId];
        return (e.milestoneAmounts, e.milestoneReleased);
    }

    /**
     * @notice Total count of escrows created.
     */
    function getEscrowCount() external view returns (uint256) {
        return _escrowIdCounter;
    }
}
