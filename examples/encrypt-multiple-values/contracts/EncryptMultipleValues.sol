// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "fhevm/lib/TFHE.sol";
import "fhevm/config/ZamaFHEVMConfig.sol";

/**
 * @title EncryptMultipleValues
 * @author FHEVM Example Hub
 * @notice Demonstrates encrypting multiple values in one transaction
 * @dev This example shows how to:
 *      - Accept multiple encrypted inputs
 *      - Process multiple encrypted values together
 *      - Store structured encrypted data
 * 
 * @custom:category encryption
 * @custom:difficulty intermediate
 */
contract EncryptMultipleValues is SepoliaZamaFHEVMConfig {
    
    struct EncryptedCoordinates {
        euint64 x;
        euint64 y;
        euint64 z;
    }
    
    mapping(address => EncryptedCoordinates) private userCoordinates;
    
    event CoordinatesStored(address indexed user);

    /**
     * @notice Store encrypted 3D coordinates
     * @param encX Encrypted X coordinate
     * @param proofX Proof for X
     * @param encY Encrypted Y coordinate
     * @param proofY Proof for Y
     * @param encZ Encrypted Z coordinate
     * @param proofZ Proof for Z
     */
    function storeCoordinates(
        einput encX, bytes calldata proofX,
        einput encY, bytes calldata proofY,
        einput encZ, bytes calldata proofZ
    ) external {
        euint64 x = TFHE.asEuint64(encX, proofX);
        euint64 y = TFHE.asEuint64(encY, proofY);
        euint64 z = TFHE.asEuint64(encZ, proofZ);
        
        userCoordinates[msg.sender] = EncryptedCoordinates(x, y, z);
        
        // Set permissions for all values
        TFHE.allowThis(x);
        TFHE.allowThis(y);
        TFHE.allowThis(z);
        TFHE.allow(x, msg.sender);
        TFHE.allow(y, msg.sender);
        TFHE.allow(z, msg.sender);
        
        emit CoordinatesStored(msg.sender);
    }

    /**
     * @notice Calculate encrypted distance from origin (simplified: x + y + z)
     * @return The sum of all coordinates (encrypted)
     */
    function calculateSum() external view returns (euint64) {
        EncryptedCoordinates storage coords = userCoordinates[msg.sender];
        euint64 sum = TFHE.add(coords.x, coords.y);
        sum = TFHE.add(sum, coords.z);
        return sum;
    }

    /**
     * @notice Get user's encrypted coordinates
     */
    function getMyCoordinates() external view returns (euint64, euint64, euint64) {
        EncryptedCoordinates storage coords = userCoordinates[msg.sender];
        return (coords.x, coords.y, coords.z);
    }
}