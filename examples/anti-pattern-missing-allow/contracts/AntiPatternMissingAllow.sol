// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@fhevm/solidity/lib/TFHE.sol";
import "@fhevm/solidity/config/ZamaFHEVMConfig.sol";

/**
 * @title AntiPatternMissingAllow
 * @author FHEVM Example Hub
 * @notice Demonstrates what happens when you forget TFHE.allowThis()
 * @dev IMPORTANT: This shows what NOT to do!
 * 
 * Anti-pattern explained:
 * - Every encrypted value needs explicit permissions
 * - Forgetting TFHE.allowThis() means the contract cannot operate on the value
 * - Forgetting TFHE.allow(value, user) means the user cannot access it
 * 
 * @custom:category anti-patterns
 * @custom:difficulty beginner
 */
contract AntiPatternMissingAllow is SepoliaZamaFHEVMConfig {
    
    euint64 private correctlyPermissioned;
    euint64 private missingContractPermission;
    euint64 private missingUserPermission;
    
    address public owner;

    constructor() {
        owner = msg.sender;
    }

    /**
     * @notice CORRECT: Stores value with all proper permissions
     */
    function storeCorrectly(einput value, bytes calldata proof) external {
        correctlyPermissioned = TFHE.asEuint64(value, proof);
        
        // Allow contract to operate on this value
        TFHE.allowThis(correctlyPermissioned);
        
        // Allow the user to access this value
        TFHE.allow(correctlyPermissioned, msg.sender);
    }

    /**
     * @notice WRONG: Missing TFHE.allowThis()
     * @dev Contract operations on this value will fail
     */
    function storeMissingAllowThis(einput value, bytes calldata proof) external {
        missingContractPermission = TFHE.asEuint64(value, proof);
        
        // OOPS! Forgot TFHE.allowThis()
        // The contract cannot perform operations on this value
        
        TFHE.allow(missingContractPermission, msg.sender);
    }

    /**
     * @notice WRONG: Missing TFHE.allow() for user
     * @dev User will not be able to access this value
     */
    function storeMissingUserAllow(einput value, bytes calldata proof) external {
        missingUserPermission = TFHE.asEuint64(value, proof);
        
        TFHE.allowThis(missingUserPermission);
        
        // OOPS! Forgot TFHE.allow(value, msg.sender)
        // The user cannot access this value for re-encryption
    }

    /**
     * @notice Try to add to correctly permissioned value - WORKS
     */
    function addToCorrect(einput value, bytes calldata proof) external {
        euint64 toAdd = TFHE.asEuint64(value, proof);
        correctlyPermissioned = TFHE.add(correctlyPermissioned, toAdd);
        TFHE.allowThis(correctlyPermissioned);
        TFHE.allow(correctlyPermissioned, msg.sender);
    }

    /**
     * @notice Try to add to value missing allowThis - MAY FAIL
     * @dev This operation may fail because contract lacks permission
     */
    function addToMissingAllowThis(einput value, bytes calldata proof) external {
        euint64 toAdd = TFHE.asEuint64(value, proof);
        // This may fail or produce unexpected results
        missingContractPermission = TFHE.add(missingContractPermission, toAdd);
        TFHE.allow(missingContractPermission, msg.sender);
    }

    /**
     * @notice Get correctly permissioned value
     */
    function getCorrect() external view returns (euint64) {
        return correctlyPermissioned;
    }

    /**
     * @notice Get value with missing contract permission
     */
    function getMissingAllowThis() external view returns (euint64) {
        return missingContractPermission;
    }

    /**
     * @notice Get value with missing user permission
     */
    function getMissingUserAllow() external view returns (euint64) {
        return missingUserPermission;
    }
}

/**
 * LESSON LEARNED:
 * ===============
 * 1. ALWAYS call TFHE.allowThis(value) after creating/modifying encrypted values
 * 2. ALWAYS call TFHE.allow(value, user) for users who need access
 * 3. Permissions must be re-applied after any operation that creates a new handle
 * 4. TFHE.add(), TFHE.sub(), etc. create NEW handles - permissions don't carry over
 */