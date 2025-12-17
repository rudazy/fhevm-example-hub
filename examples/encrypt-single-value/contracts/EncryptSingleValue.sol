// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "fhevm/lib/TFHE.sol";


/**
 * @title EncryptSingleValue
 * @author FHEVM Example Hub
 * @notice Demonstrates encrypting and storing a single value
 * @dev This example shows how to:
 *      - Accept encrypted input from users
 *      - Verify input proofs
 *      - Store encrypted values on-chain
 *      - Set proper access permissions
 * 
 * @custom:category encryption
 * @custom:difficulty beginner
 */
contract EncryptSingleValue {
    
    /// @notice Mapping of user addresses to their encrypted secret
    mapping(address => euint64) private userSecrets;
    
    /// @notice Emitted when a user stores a secret
    event SecretStored(address indexed user);

    /**
     * @notice Store an encrypted secret
     * @param encryptedSecret The encrypted value (einput)
     * @param inputProof The proof verifying the encryption
     */
    function storeSecret(einput encryptedSecret, bytes calldata inputProof) external {
        // Convert einput to euint64 with proof verification
        euint64 secret = TFHE.asEuint64(encryptedSecret, inputProof);
        
        // Store the encrypted value
        userSecrets[msg.sender] = secret;
        
        // Allow the contract to operate on this value
        TFHE.allow(secret, address(this));
        
        // Allow the user to access their own secret
        TFHE.allow(secret, msg.sender);
        
        emit SecretStored(msg.sender);
    }

    /**
     * @notice Get the caller's encrypted secret
     * @return The encrypted secret (only usable by authorized addresses)
     */
    function getMySecret() external view returns (euint64) {
        return userSecrets[msg.sender];
    }

    /**
     * @notice Check if caller has stored a secret
     * @return True if the caller has a stored secret
     */
    function hasSecret() external view returns (bool) {
        return TFHE.isInitialized(userSecrets[msg.sender]);
    }
}