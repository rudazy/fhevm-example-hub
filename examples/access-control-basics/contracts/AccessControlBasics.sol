// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@fhevm/solidity/lib/TFHE.sol";
import "@fhevm/solidity/config/ZamaFHEVMConfig.sol";

/**
 * @title AccessControlBasics
 * @author FHEVM Example Hub
 * @notice Demonstrates basic access control for encrypted values
 * @dev This example shows how to:
 *      - Use TFHE.allow() to grant access to specific addresses
 *      - Use TFHE.allowThis() to allow contract to operate on values
 *      - Properly manage permissions when values are updated
 * 
 * @custom:category access-control
 * @custom:difficulty beginner
 */
contract AccessControlBasics is SepoliaZamaFHEVMConfig {
    
    euint64 private secretValue;
    address public owner;
    mapping(address => bool) public authorizedReaders;
    
    event SecretUpdated(address indexed by);
    event ReaderAuthorized(address indexed reader);
    event ReaderRevoked(address indexed reader);

    constructor() {
        owner = msg.sender;
        secretValue = TFHE.asEuint64(0);
        TFHE.allowThis(secretValue);
        TFHE.allow(secretValue, owner);
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    /**
     * @notice Store a new secret value
     */
    function setSecret(einput encryptedValue, bytes calldata inputProof) external onlyOwner {
        secretValue = TFHE.asEuint64(encryptedValue, inputProof);
        TFHE.allowThis(secretValue);
        TFHE.allow(secretValue, owner);
        emit SecretUpdated(msg.sender);
    }

    /**
     * @notice Authorize an address to read the secret
     */
    function authorizeReader(address reader) external onlyOwner {
        authorizedReaders[reader] = true;
        TFHE.allow(secretValue, reader);
        emit ReaderAuthorized(reader);
    }

    /**
     * @notice Revoke read access
     */
    function revokeReader(address reader) external onlyOwner {
        authorizedReaders[reader] = false;
        emit ReaderRevoked(reader);
    }

    /**
     * @notice Get the secret value (only for authorized addresses)
     */
    function getSecret() external view returns (euint64) {
        require(msg.sender == owner || authorizedReaders[msg.sender], "Not authorized");
        return secretValue;
    }

    /**
     * @notice Check if an address is authorized
     */
    function isAuthorized(address addr) external view returns (bool) {
        return addr == owner || authorizedReaders[addr];
    }
}