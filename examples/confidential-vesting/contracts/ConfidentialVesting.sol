// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "fhevm/lib/TFHE.sol";


import "fhevm/gateway/GatewayCaller.sol";
import "fhevm/gateway/lib/Gateway.sol";

/**
 * @title ConfidentialVesting
 * @author FHEVM Example Hub
 * @notice Vesting wallet with encrypted amounts
 * @dev This example shows:
 *      - Encrypted vesting schedules
 *      - Time-based release with encrypted amounts
 *      - Private beneficiary balances
 * 
 * @custom:category advanced
 * @custom:difficulty advanced
 */
contract ConfidentialVesting is GatewayCaller {
    
    struct VestingSchedule {
        euint64 totalAmount;
        euint64 releasedAmount;
        uint256 startTime;
        uint256 duration;
        bool exists;
    }
    
    address public owner;
    mapping(address => VestingSchedule) private vestingSchedules;
    
    event VestingCreated(address indexed beneficiary, uint256 startTime, uint256 duration);
    event TokensReleased(address indexed beneficiary);
    event ReleaseRequested(address indexed beneficiary, uint256 requestId);

    constructor() {
        owner = msg.sender;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    /**
     * @notice Create a vesting schedule for a beneficiary
     * @param beneficiary Address to receive vested tokens
     * @param encryptedAmount Encrypted total vesting amount
     * @param inputProof Proof for encrypted input
     * @param duration Vesting duration in seconds
     */
    function createVesting(
        address beneficiary,
        einput encryptedAmount,
        bytes calldata inputProof,
        uint256 duration
    ) external onlyOwner {
        require(!vestingSchedules[beneficiary].exists, "Vesting already exists");
        require(beneficiary != address(0), "Invalid beneficiary");
        require(duration > 0, "Invalid duration");
        
        euint64 amount = TFHE.asEuint64(encryptedAmount, inputProof);
        
        vestingSchedules[beneficiary] = VestingSchedule({
            totalAmount: amount,
            releasedAmount: TFHE.asEuint64(0),
            startTime: block.timestamp,
            duration: duration,
            exists: true
        });
        
        TFHE.allow(amount, address(this));
        TFHE.allow(amount, beneficiary);
        TFHE.allow(vestingSchedules[beneficiary].releasedAmount, address(this));
        TFHE.allow(vestingSchedules[beneficiary].releasedAmount, beneficiary);
        
        emit VestingCreated(beneficiary, block.timestamp, duration);
    }

    /**
     * @notice Calculate vested amount based on time
     * @param beneficiary Address to check
     * @return Encrypted vested amount
     */
    function vestedAmount(address beneficiary) public view returns (euint64) {
        VestingSchedule storage schedule = vestingSchedules[beneficiary];
        require(schedule.exists, "No vesting schedule");
        
        if (block.timestamp >= schedule.startTime + schedule.duration) {
            // Fully vested
            return schedule.totalAmount;
        }
        
        // Partial vesting - simplified calculation
        // In production, you'd use more precise math
        uint256 elapsed = block.timestamp - schedule.startTime;
        uint256 vestingPercent = (elapsed * 100) / schedule.duration;
        
        // This is a simplified approach - multiply by percent then divide
        euint64 percent = TFHE.asEuint64(uint64(vestingPercent));
        euint64 vested = TFHE.div(TFHE.mul(schedule.totalAmount, percent), TFHE.asEuint64(100));
        
        return vested;
    }

    /**
     * @notice Release vested tokens to beneficiary
     */
    function release() external {
        VestingSchedule storage schedule = vestingSchedules[msg.sender];
        require(schedule.exists, "No vesting schedule");
        
        euint64 vested = vestedAmount(msg.sender);
        euint64 releasable = TFHE.sub(vested, schedule.releasedAmount);
        
        schedule.releasedAmount = vested;
        
        TFHE.allow(schedule.releasedAmount, address(this));
        TFHE.allow(schedule.releasedAmount, msg.sender);
        TFHE.allow(releasable, address(this));
        TFHE.allow(releasable, msg.sender);
        
        emit TokensReleased(msg.sender);
    }

    /**
     * @notice Get vesting info for caller
     */
    function getMyVesting() external view returns (
        uint256 startTime,
        uint256 duration,
        bool exists
    ) {
        VestingSchedule storage schedule = vestingSchedules[msg.sender];
        return (schedule.startTime, schedule.duration, schedule.exists);
    }

    /**
     * @notice Get encrypted total amount for caller
     */
    function getMyTotalAmount() external view returns (euint64) {
        require(vestingSchedules[msg.sender].exists, "No vesting");
        return vestingSchedules[msg.sender].totalAmount;
    }

    /**
     * @notice Get encrypted released amount for caller
     */
    function getMyReleasedAmount() external view returns (euint64) {
        require(vestingSchedules[msg.sender].exists, "No vesting");
        return vestingSchedules[msg.sender].releasedAmount;
    }

    /**
     * @notice Check if vesting is fully vested
     */
    function isFullyVested(address beneficiary) external view returns (bool) {
        VestingSchedule storage schedule = vestingSchedules[beneficiary];
        if (!schedule.exists) return false;
        return block.timestamp >= schedule.startTime + schedule.duration;
    }
}