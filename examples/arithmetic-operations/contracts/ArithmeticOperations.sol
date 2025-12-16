// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@fhevm/solidity/lib/TFHE.sol";
import "@fhevm/solidity/config/ZamaFHEVMConfig.sol";

/**
 * @title ArithmeticOperations
 * @author FHEVM Example Hub
 * @notice Demonstrates basic FHE arithmetic operations
 * @dev This example shows how to:
 *      - Perform encrypted addition (FHE.add)
 *      - Perform encrypted subtraction (FHE.sub)
 *      - Perform encrypted multiplication (FHE.mul)
 *      - Perform encrypted division (FHE.div)
 * 
 * @custom:category basic
 * @custom:difficulty beginner
 */
contract ArithmeticOperations is SepoliaZamaFHEVMConfig {
    
    euint64 private result;
    address public owner;

    constructor() {
        owner = msg.sender;
        result = TFHE.asEuint64(0);
        TFHE.allowThis(result);
        TFHE.allow(result, owner);
    }

    /**
     * @notice Adds two encrypted values
     * @param a First encrypted input
     * @param aProof Proof for first input
     * @param b Second encrypted input
     * @param bProof Proof for second input
     */
    function add(
        einput a, bytes calldata aProof,
        einput b, bytes calldata bProof
    ) external {
        euint64 encA = TFHE.asEuint64(a, aProof);
        euint64 encB = TFHE.asEuint64(b, bProof);
        result = TFHE.add(encA, encB);
        TFHE.allowThis(result);
        TFHE.allow(result, owner);
    }

    /**
     * @notice Subtracts two encrypted values
     */
    function subtract(
        einput a, bytes calldata aProof,
        einput b, bytes calldata bProof
    ) external {
        euint64 encA = TFHE.asEuint64(a, aProof);
        euint64 encB = TFHE.asEuint64(b, bProof);
        result = TFHE.sub(encA, encB);
        TFHE.allowThis(result);
        TFHE.allow(result, owner);
    }

    /**
     * @notice Multiplies two encrypted values
     */
    function multiply(
        einput a, bytes calldata aProof,
        einput b, bytes calldata bProof
    ) external {
        euint64 encA = TFHE.asEuint64(a, aProof);
        euint64 encB = TFHE.asEuint64(b, bProof);
        result = TFHE.mul(encA, encB);
        TFHE.allowThis(result);
        TFHE.allow(result, owner);
    }

    /**
     * @notice Divides two encrypted values
     */
    function divide(
        einput a, bytes calldata aProof,
        einput b, bytes calldata bProof
    ) external {
        euint64 encA = TFHE.asEuint64(a, aProof);
        euint64 encB = TFHE.asEuint64(b, bProof);
        result = TFHE.div(encA, encB);
        TFHE.allowThis(result);
        TFHE.allow(result, owner);
    }

    function getResult() external view returns (euint64) {
        return result;
    }
}