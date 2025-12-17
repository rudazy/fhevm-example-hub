// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "fhevm/lib/TFHE.sol";


/**
 * @title HandleLifecycle
 * @author FHEVM Example Hub
 * @notice Demonstrates the lifecycle of encrypted handles
 * @dev This example shows:
 *      - How handles are created from encrypted inputs
 *      - How operations create new handles
 *      - How permissions must be managed for each handle
 *      - Handle persistence in storage
 * 
 * @custom:category advanced
 * @custom:difficulty intermediate
 */
contract HandleLifecycle {
    
    // Storage slots for demonstrating handle persistence
    euint64 public handle1;
    euint64 public handle2;
    euint64 public handle3;
    
    address public owner;
    
    // Track handle creation for demonstration
    event HandleCreated(string description, uint256 handleId);
    event OperationPerformed(string operation, uint256 resultHandleId);

    constructor() {
        owner = msg.sender;
    }

    /**
     * @notice Stage 1: Create handle from encrypted input
     * @dev This is where handles are born - from user-provided encrypted data
     */
    function stage1_createFromInput(einput encValue, bytes calldata proof) external {
        // A new handle is created here
        handle1 = TFHE.asEuint64(encValue, proof);
        
        // Handle must be permissioned immediately
        TFHE.allow(handle1, address(this));
        TFHE.allow(handle1, owner);
        
        emit HandleCreated("Created from encrypted input", euint64.unwrap(handle1));
    }

    /**
     * @notice Stage 2: Create handle from plaintext
     * @dev Handles can also be created from plaintext values
     */
    function stage2_createFromPlaintext(uint64 plainValue) external {
        // New handle created from plaintext
        handle2 = TFHE.asEuint64(plainValue);
        
        TFHE.allow(handle2, address(this));
        TFHE.allow(handle2, owner);
        
        emit HandleCreated("Created from plaintext", euint64.unwrap(handle2));
    }

    /**
     * @notice Stage 3: Operations create NEW handles
     * @dev Important: The result of any FHE operation is a NEW handle
     */
    function stage3_operationCreatesNewHandle() external {
        require(TFHE.isInitialized(handle1), "Run stage1 first");
        require(TFHE.isInitialized(handle2), "Run stage2 first");
        
        // This creates a COMPLETELY NEW handle
        // handle1 and handle2 still exist separately
        handle3 = TFHE.add(handle1, handle2);
        
        // The new handle needs its own permissions
        // Permissions from handle1 and handle2 do NOT transfer
        TFHE.allow(handle3, address(this));
        TFHE.allow(handle3, owner);
        
        emit OperationPerformed("add(handle1, handle2)", euint64.unwrap(handle3));
    }

    /**
     * @notice Stage 4: Overwriting handles
     * @dev When you assign a new value, the old handle is orphaned
     */
    function stage4_overwriteHandle(einput newValue, bytes calldata proof) external {
        uint256 oldHandleId = euint64.unwrap(handle1);
        
        // Old handle1 is now orphaned (still exists but no longer referenced)
        handle1 = TFHE.asEuint64(newValue, proof);
        
        TFHE.allow(handle1, address(this));
        TFHE.allow(handle1, owner);
        
        emit HandleCreated("Overwrote handle1", euint64.unwrap(handle1));
        // Note: oldHandleId is now orphaned
    }

    /**
     * @notice Stage 5: Chained operations
     * @dev Each operation in a chain creates intermediate handles
     */
    function stage5_chainedOperations(einput a, bytes calldata proofA) external {
        euint64 inputHandle = TFHE.asEuint64(a, proofA);
        
        // Each operation creates a new handle
        euint64 temp1 = TFHE.add(inputHandle, TFHE.asEuint64(10));  // Handle created
        euint64 temp2 = TFHE.mul(temp1, TFHE.asEuint64(2));         // Another handle
        euint64 temp3 = TFHE.sub(temp2, TFHE.asEuint64(5));         // Another handle
        
        // Only permission the final result
        handle1 = temp3;
        TFHE.allow(handle1, address(this));
        TFHE.allow(handle1, owner);
        
        // temp1 and temp2 are intermediate handles - not stored
        emit OperationPerformed("chained: ((a + 10) * 2) - 5", euint64.unwrap(handle1));
    }

    /**
     * @notice Check if handles are initialized
     */
    function getHandleStatus() external view returns (bool h1Init, bool h2Init, bool h3Init) {
        return (
            TFHE.isInitialized(handle1),
            TFHE.isInitialized(handle2),
            TFHE.isInitialized(handle3)
        );
    }

    /**
     * @notice Get raw handle IDs for demonstration
     */
    function getHandleIds() external view returns (uint256, uint256, uint256) {
        return (
            euint64.unwrap(handle1),
            euint64.unwrap(handle2),
            euint64.unwrap(handle3)
        );
    }
}