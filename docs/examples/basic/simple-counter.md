# Simple Counter

> **Category:** basic
> **Difficulty:** beginner

A simple encrypted counter demonstrating FHE.add and FHE.sub

## Overview

This example shows how to:
- Store encrypted values (euint64)
- Perform encrypted addition (FHE.add)
- Perform encrypted subtraction (FHE.sub)
- Handle access control for encrypted values


## Contract: SimpleCounter

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "fhevm/lib/TFHE.sol";
import "fhevm/config/ZamaFHEVMConfig.sol";
import "fhevm/config/ZamaGatewayConfig.sol";
import "fhevm/gateway/GatewayCaller.sol";

/**
 * @title SimpleCounter
 * @author FHEVM Example Hub
 * @notice A simple encrypted counter demonstrating basic FHE operations
 * @dev This example shows how to:
 *      - Store encrypted values (euint64)
 *      - Perform encrypted addition (FHE.add)
 *      - Perform encrypted subtraction (FHE.sub)
 *      - Handle access control for encrypted values
 * 
 * @custom:category basic
 * @custom:difficulty beginner
 */
contract SimpleCounter is SepoliaZamaFHEVMConfig, SepoliaZamaGatewayConfig, GatewayCaller {
    
    /// @notice The encrypted counter value
    euint64 private counter;
    
    /// @notice The contract owner
    address public owner;

    /// @notice Emitted when counter is incremented
    event CounterIncremented(address indexed by);
    
    /// @notice Emitted when counter is decremented
    event CounterDecremented(address indexed by);
    
    /// @notice Emitted when counter is reset
    event CounterReset(address indexed by);

    /// @notice Emitted when decryption is requested
    event DecryptionRequested(uint256 indexed requestId);

    /// @notice Emitted when counter value is decrypted
    event CounterDecrypted(uint256 decryptedValue);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }

    /**
     * @notice Initializes the counter to an encrypted zero
     */
    constructor() {
        owner = msg.sender;
        // Initialize counter to encrypted 0
        counter = TFHE.asEuint64(0);
        // Allow this contract to use the counter value
        TFHE.allowThis(counter);
        // Allow owner to access the counter
        TFHE.allow(counter, owner);
    }

    /**
     * @notice Increments the counter by an encrypted amount
     * @dev Demonstrates FHE.add operation
     * @param encryptedAmount The encrypted amount to add (einput)
     * @param inputProof The proof for the encrypted input
     */
    function increment(einput encryptedAmount, bytes calldata inputProof) external {
        // Convert input to euint64 with proof verification
        euint64 amount = TFHE.asEuint64(encryptedAmount, inputProof);
        // Perform encrypted addition
        counter = TFHE.add(counter, amount);
        // Update permissions for the new counter value
        TFHE.allowThis(counter);
        TFHE.allow(counter, owner);
        
        emit CounterIncremented(msg.sender);
    }

    /**
     * @notice Increments the counter by 1
     * @dev Simple increment without encrypted input
     */
    function incrementByOne() external {
        counter = TFHE.add(counter, TFHE.asEuint64(1));
        TFHE.allowThis(counter);
        TFHE.allow(counter, owner);
        
        emit CounterIncremented(msg.sender);
    }

    /**
     * @notice Decrements the counter by an encrypted amount
     * @dev Demonstrates FHE.sub operation
     * @param encryptedAmount The encrypted amount to subtract (einput)
     * @param inputProof The proof for the encrypted input
     */
    function decrement(einput encryptedAmount, bytes calldata inputProof) external {
        euint64 amount = TFHE.asEuint64(encryptedAmount, inputProof);
        counter = TFHE.sub(counter, amount);
        TFHE.allowThis(counter);
        TFHE.allow(counter, owner);
        
        emit CounterDecremented(msg.sender);
    }

    /**
     * @notice Decrements the counter by 1
     * @dev Simple decrement without encrypted input
     */
    function decrementByOne() external {
        counter = TFHE.sub(counter, TFHE.asEuint64(1));
        TFHE.allowThis(counter);
        TFHE.allow(counter, owner);
        
        emit CounterDecremented(msg.sender);
    }

    /**
     * @notice Resets the counter to zero
     * @dev Only callable by owner
     */
    function reset() external onlyOwner {
        counter = TFHE.asEuint64(0);
        TFHE.allowThis(counter);
        TFHE.allow(counter, owner);
        
        emit CounterReset(msg.sender);
    }

    /**
     * @notice Requests decryption of the counter value
     * @dev Uses the Gateway for async decryption
     * @return requestId The ID of the decryption request
     */
    function requestDecrypt() external onlyOwner returns (uint256) {
        uint256[] memory cts = new uint256[](1);
        cts[0] = Gateway.toUint256(counter);
        uint256 requestId = Gateway.requestDecryption(
            cts,
            this.callbackDecrypt.selector,
            0,
            block.timestamp + 100,
            false
        );
        emit DecryptionRequested(requestId);
        return requestId;
    }

    /**
     * @notice Callback function for decryption
     * @param decryptedValue The decrypted counter value
     */
    function callbackDecrypt(uint256, uint64 decryptedValue) external onlyGateway {
        emit CounterDecrypted(decryptedValue);
    }

    /**
     * @notice Returns the encrypted counter (only accessible by owner)
     * @dev The returned handle can only be used by authorized addresses
     * @return The encrypted counter value
     */
    function getCounter() external view returns (euint64) {
        return counter;
    }
}
```

## Key Concepts

- Store encrypted values (euint64)
- Perform encrypted addition (FHE.add)
- Perform encrypted subtraction (FHE.sub)
- Handle access control for encrypted values

## How to Run

```bash
cd examples/simple-counter
npm install
npm run compile
npm run test
```

## Related Examples

- Check other examples in the Basic Examples category

