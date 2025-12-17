// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "fhevm/lib/TFHE.sol";


/**
 * @title AntiPatternCommonMistakes
 * @author FHEVM Example Hub
 * @notice Collection of common FHEVM mistakes
 * @dev This contract shows multiple anti-patterns in one place
 * 
 * @custom:category anti-patterns
 * @custom:difficulty intermediate
 */
contract AntiPatternCommonMistakes {
    
    euint64 private value1;
    euint64 private value2;
    address public owner;

    constructor() {
        owner = msg.sender;
    }

    // ========================================
    // MISTAKE 1: Comparing encrypted to plaintext incorrectly
    // ========================================
    
    /**
     * @notice WRONG: Direct comparison does not work as expected
     * @dev You cannot compare euint64 with uint64 directly
     */
    function wrongComparison(einput encValue, bytes calldata proof) external view returns (bool) {
        euint64 encrypted = TFHE.asEuint64(encValue, proof);
        
        // WRONG: This does not compare the actual values
        // It compares handles/references
        return euint64.unwrap(encrypted) > 100;
    }

    /**
     * @notice CORRECT: Use TFHE.gt for encrypted comparison
     */
    function correctComparison(einput encValue, bytes calldata proof) external returns (ebool) {
        euint64 encrypted = TFHE.asEuint64(encValue, proof);
        euint64 threshold = TFHE.asEuint64(100);
        
        ebool result = TFHE.gt(encrypted, threshold);
        TFHE.allow(result, address(this));
        TFHE.allow(result, msg.sender);
        
        return result;
    }

    // ========================================
    // MISTAKE 2: Not re-applying permissions after operations
    // ========================================

    /**
     * @notice WRONG: Permissions lost after operation
     */
    function wrongPermissionHandling(einput a, bytes calldata proofA, einput b, bytes calldata proofB) external {
        euint64 encA = TFHE.asEuint64(a, proofA);
        euint64 encB = TFHE.asEuint64(b, proofB);
        
        TFHE.allow(encA, address(this));
        TFHE.allow(encB, address(this));
        
        // This creates a NEW handle
        value1 = TFHE.add(encA, encB);
        
        // WRONG: Forgot to allowThis on the NEW value
        // value1 now has no permissions!
    }

    /**
     * @notice CORRECT: Re-apply permissions after every operation
     */
    function correctPermissionHandling(einput a, bytes calldata proofA, einput b, bytes calldata proofB) external {
        euint64 encA = TFHE.asEuint64(a, proofA);
        euint64 encB = TFHE.asEuint64(b, proofB);
        
        // Create new value
        value2 = TFHE.add(encA, encB);
        
        // CORRECT: Apply permissions to the new handle
        TFHE.allow(value2, address(this));
        TFHE.allow(value2, msg.sender);
    }

    // ========================================
    // MISTAKE 3: Assuming encrypted zero is falsy
    // ========================================

    /**
     * @notice WRONG: Cannot use encrypted value in boolean context
     */
    function wrongZeroCheck() external view returns (bool) {
        // WRONG: This checks if the HANDLE is zero, not the encrypted value
        return euint64.unwrap(value1) != 0;
    }

    /**
     * @notice CORRECT: Use TFHE.ne for zero check
     */
    function correctZeroCheck() external returns (ebool) {
        euint64 zero = TFHE.asEuint64(0);
        ebool result = TFHE.ne(value2, zero);
        TFHE.allow(result, address(this));
        TFHE.allow(result, msg.sender);
        return result;
    }

    // ========================================
    // MISTAKE 4: Returning encrypted values to unauthorized users
    // ========================================

    /**
     * @notice WRONG: No access control on encrypted data
     */
    function wrongNoAccessControl() external view returns (euint64) {
        // Anyone can call this, but they won't be able to decrypt
        // without proper TFHE.allow() - confusing API design
        return value1;
    }

    /**
     * @notice CORRECT: Explicit access control
     */
    function correctWithAccessControl() external view returns (euint64) {
        require(msg.sender == owner, "Not authorized");
        return value2;
    }

    /**
     * @notice Get values for testing
     */
    function getValue1() external view returns (euint64) {
        return value1;
    }

    function getValue2() external view returns (euint64) {
        return value2;
    }
}

/**
 * LESSONS LEARNED:
 * ================
 * 1. Never compare encrypted values using regular operators (>, <, ==)
 * 2. Always re-apply permissions after ANY operation that creates new handles
 * 3. Cannot use encrypted values in boolean contexts
 * 4. Add explicit access control even for encrypted returns
 * 5. TFHE operations create NEW handles - old permissions don't transfer
 */