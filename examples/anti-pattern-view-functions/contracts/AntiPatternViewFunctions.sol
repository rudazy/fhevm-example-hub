// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@fhevm/solidity/lib/TFHE.sol";
import "@fhevm/solidity/config/ZamaFHEVMConfig.sol";

/**
 * @title AntiPatternViewFunctions
 * @author FHEVM Example Hub
 * @notice Demonstrates a common anti-pattern: trying to decrypt in view functions
 * @dev IMPORTANT: This shows what NOT to do!
 * 
 * Anti-pattern explained:
 * - View functions cannot decrypt encrypted values
 * - Decryption requires async Gateway calls
 * - You can only return encrypted handles from view functions
 * 
 * @custom:category anti-patterns
 * @custom:difficulty beginner
 */
contract AntiPatternViewFunctions is SepoliaZamaFHEVMConfig {
    
    euint64 private secretBalance;
    address public owner;

    constructor() {
        owner = msg.sender;
        secretBalance = TFHE.asEuint64(1000);
        TFHE.allowThis(secretBalance);
        TFHE.allow(secretBalance, owner);
    }

    /**
     * @notice CORRECT: Returns encrypted handle
     * @dev The caller can then request decryption via Gateway
     */
    function getEncryptedBalance() external view returns (euint64) {
        return secretBalance;
    }

    /**
     * @notice WRONG APPROACH: You might think you can do this
     * @dev This function shows what developers often TRY to do
     *      but it will NOT work as expected.
     *      
     *      You CANNOT simply cast euint64 to uint64 and get the value.
     *      The "value" you get is just the handle ID, not the actual value.
     */
    function getBalanceWrongApproach() external view returns (uint256) {
        // This returns the HANDLE, not the decrypted value!
        // This is a common mistake - developers think they're getting
        // the actual value but they're just getting a reference number
        return euint64.unwrap(secretBalance);
    }

    /**
     * @notice Update balance (for testing)
     */
    function setBalance(einput newBalance, bytes calldata proof) external {
        require(msg.sender == owner, "Only owner");
        secretBalance = TFHE.asEuint64(newBalance, proof);
        TFHE.allowThis(secretBalance);
        TFHE.allow(secretBalance, owner);
    }
}

/**
 * LESSON LEARNED:
 * ===============
 * 1. View functions can only return encrypted handles (euint64, ebool, etc.)
 * 2. To get actual decrypted values, you must use Gateway.requestDecryption()
 * 3. Decryption is ASYNC - you submit a request and receive a callback
 * 4. Never assume you can "read" encrypted values directly
 */