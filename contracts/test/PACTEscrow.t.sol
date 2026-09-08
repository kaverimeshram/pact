// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../PACTEscrow.sol";

contract PACTEscrowTest is Test {
    PACTEscrow public escrow;

    address payable public payer = payable(address(0x1111111111111111111111111111111111111111));
    address payable public beneficiary = payable(address(0x2222222222222222222222222222222222222222));
    address payable public attacker = payable(address(0x3333333333333333333333333333333333333333));

    function setUp() public {
        escrow = new PACTEscrow();
        vm.deal(payer, 10 ether);
        vm.deal(attacker, 10 ether);
    }

    function test_CreateAndFundEscrow3Milestones() public {
        vm.startPrank(payer);

        uint256[] memory milestones = new uint256[](3);
        milestones[0] = 0.001 ether; // $10 equiv
        milestones[1] = 0.002 ether; // $20 equiv
        milestones[2] = 0.002 ether; // $20 equiv
        uint256 total = 0.005 ether;

        uint256 escrowId = escrow.createEscrow{value: total}(
            beneficiary,
            milestones,
            "comm-hackathon-demo-1",
            "ResearchAgent-A"
        );

        assertEq(escrowId, 1);
        assertEq(escrow.getEscrowCount(), 1);

        (
            uint256 id,
            address p,
            address b,
            uint256 totalAmount,
            uint256 releasedAmount,
            uint256 count,
            PACTEscrow.EscrowStatus status,
            string memory commId,
            string memory name
        ) = escrow.getEscrow(1);

        assertEq(id, 1);
        assertEq(p, payer);
        assertEq(b, beneficiary);
        assertEq(totalAmount, total);
        assertEq(releasedAmount, 0);
        assertEq(count, 3);
        assertEq(uint256(status), uint256(PACTEscrow.EscrowStatus.FUNDED));
        assertEq(commId, "comm-hackathon-demo-1");
        assertEq(name, "ResearchAgent-A");

        (uint256[] memory amounts, bool[] memory released) = escrow.getMilestones(1);
        assertEq(amounts.length, 3);
        assertEq(amounts[0], 0.001 ether);
        assertEq(amounts[1], 0.002 ether);
        assertEq(amounts[2], 0.002 ether);
        assertFalse(released[0]);
        assertFalse(released[1]);
        assertFalse(released[2]);

        vm.stopPrank();
    }

    function test_ReleaseMilestonesSequentially() public {
        vm.startPrank(payer);

        uint256[] memory milestones = new uint256[](3);
        milestones[0] = 0.001 ether;
        milestones[1] = 0.002 ether;
        milestones[2] = 0.002 ether;
        uint256 total = 0.005 ether;

        escrow.createEscrow{value: total}(
            beneficiary,
            milestones,
            "comm-1",
            "ResearchAgent-A"
        );

        uint256 initialBeneficiaryBalance = beneficiary.balance;

        // Release Milestone 0 (Upfront)
        escrow.releaseMilestone(1, 0);
        assertEq(beneficiary.balance, initialBeneficiaryBalance + 0.001 ether);

        // Release Milestone 1 (Checkpoint)
        escrow.releaseMilestone(1, 1);
        assertEq(beneficiary.balance, initialBeneficiaryBalance + 0.003 ether);

        // Release Milestone 2 (Final Verification)
        escrow.releaseMilestone(1, 2);
        assertEq(beneficiary.balance, initialBeneficiaryBalance + 0.005 ether);

        // Verify status is COMPLETED
        (, , , , uint256 releasedAmount, , PACTEscrow.EscrowStatus status, , ) = escrow.getEscrow(1);
        assertEq(releasedAmount, total);
        assertEq(uint256(status), uint256(PACTEscrow.EscrowStatus.COMPLETED));

        vm.stopPrank();
    }

    function test_RevertWhen_NonPayerReleasesMilestone() public {
        vm.prank(payer);
        uint256[] memory milestones = new uint256[](2);
        milestones[0] = 1 ether;
        milestones[1] = 1 ether;
        escrow.createEscrow{value: 2 ether}(beneficiary, milestones, "comm-1", "Agent-A");

        vm.prank(attacker);
        vm.expectRevert(abi.encodeWithSelector(PACTEscrow.Unauthorized.selector, attacker));
        escrow.releaseMilestone(1, 0);
    }

    function test_RevertWhen_DoubleReleasingMilestone() public {
        vm.startPrank(payer);
        uint256[] memory milestones = new uint256[](2);
        milestones[0] = 1 ether;
        milestones[1] = 1 ether;
        escrow.createEscrow{value: 2 ether}(beneficiary, milestones, "comm-1", "Agent-A");

        escrow.releaseMilestone(1, 0);

        vm.expectRevert(abi.encodeWithSelector(PACTEscrow.MilestoneAlreadyReleased.selector, 0));
        escrow.releaseMilestone(1, 0);
        vm.stopPrank();
    }

    function test_RevertWhen_ZeroAddressBeneficiary() public {
        vm.startPrank(payer);
        uint256[] memory milestones = new uint256[](1);
        milestones[0] = 1 ether;

        vm.expectRevert(abi.encodeWithSelector(PACTEscrow.ZeroAddress.selector));
        escrow.createEscrow{value: 1 ether}(payable(address(0)), milestones, "comm-1", "Agent-A");
        vm.stopPrank();
    }

    function test_RevertWhen_ZeroMilestonesOrZeroAmount() public {
        vm.startPrank(payer);
        uint256[] memory emptyMilestones = new uint256[](0);

        vm.expectRevert(abi.encodeWithSelector(PACTEscrow.ZeroMilestones.selector));
        escrow.createEscrow(beneficiary, emptyMilestones, "comm-1", "Agent-A");

        uint256[] memory zeroMilestone = new uint256[](1);
        zeroMilestone[0] = 0;

        vm.expectRevert(abi.encodeWithSelector(PACTEscrow.ZeroAmount.selector));
        escrow.createEscrow(beneficiary, zeroMilestone, "comm-1", "Agent-A");
        vm.stopPrank();
    }

    function test_RevertWhen_FundingMismatch() public {
        vm.startPrank(payer);
        uint256[] memory milestones = new uint256[](2);
        milestones[0] = 1 ether;
        milestones[1] = 1 ether;

        // Trying to fund with 1.5 ether when 2 ether is required
        vm.expectRevert(abi.encodeWithSelector(PACTEscrow.InvalidFundingAmount.selector, 2 ether, 1.5 ether));
        escrow.createEscrow{value: 1.5 ether}(beneficiary, milestones, "comm-1", "Agent-A");
        vm.stopPrank();
    }

    function test_CreateUnfundedAndFundLater() public {
        vm.startPrank(payer);
        uint256[] memory milestones = new uint256[](2);
        milestones[0] = 1 ether;
        milestones[1] = 1 ether;

        // Create with msg.value = 0
        uint256 escrowId = escrow.createEscrow(beneficiary, milestones, "comm-1", "Agent-A");
        (, , , , , , PACTEscrow.EscrowStatus status, , ) = escrow.getEscrow(escrowId);
        assertEq(uint256(status), uint256(PACTEscrow.EscrowStatus.CREATED));

        // Fund escrow
        escrow.fundEscrow{value: 2 ether}(escrowId);
        (, , , , , , status, , ) = escrow.getEscrow(escrowId);
        assertEq(uint256(status), uint256(PACTEscrow.EscrowStatus.FUNDED));
        vm.stopPrank();
    }
}
