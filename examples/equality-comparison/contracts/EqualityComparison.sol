// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "fhevm/lib/TFHE.sol";
import "fhevm/config/ZamaFHEVMConfig.sol";

/**
 * @title EqualityComparison
 * @author FHEVM Example Hub
 * @notice Demonstrates FHE comparison operations
 * @dev This example shows how to:
 *      - Compare encrypted values for equality (FHE.eq)
 *      - Compare encrypted values for inequality (FHE.ne)
 *      - Compare encrypted values with greater/less than (FHE.gt, FHE.lt)
 * 
 * @custom:category basic
 * @custom:difficulty beginner
 */
contract EqualityComparison is SepoliaZamaFHEVMConfig {
    
    ebool private lastComparisonResult;
    address public owner;

    constructor() {
        owner = msg.sender;
    }

    /**
     * @notice Checks if two encrypted values are equal
     */
    function isEqual(
        einput a, bytes calldata aProof,
        einput b, bytes calldata bProof
    ) external {
        euint64 encA = TFHE.asEuint64(a, aProof);
        euint64 encB = TFHE.asEuint64(b, bProof);
        lastComparisonResult = TFHE.eq(encA, encB);
        TFHE.allowThis(lastComparisonResult);
        TFHE.allow(lastComparisonResult, owner);
    }

    /**
     * @notice Checks if two encrypted values are not equal
     */
    function isNotEqual(
        einput a, bytes calldata aProof,
        einput b, bytes calldata bProof
    ) external {
        euint64 encA = TFHE.asEuint64(a, aProof);
        euint64 encB = TFHE.asEuint64(b, bProof);
        lastComparisonResult = TFHE.ne(encA, encB);
        TFHE.allowThis(lastComparisonResult);
        TFHE.allow(lastComparisonResult, owner);
    }

    /**
     * @notice Checks if a is greater than b
     */
    function isGreaterThan(
        einput a, bytes calldata aProof,
        einput b, bytes calldata bProof
    ) external {
        euint64 encA = TFHE.asEuint64(a, aProof);
        euint64 encB = TFHE.asEuint64(b, bProof);
        lastComparisonResult = TFHE.gt(encA, encB);
        TFHE.allowThis(lastComparisonResult);
        TFHE.allow(lastComparisonResult, owner);
    }

    /**
     * @notice Checks if a is less than b
     */
    function isLessThan(
        einput a, bytes calldata aProof,
        einput b, bytes calldata bProof
    ) external {
        euint64 encA = TFHE.asEuint64(a, aProof);
        euint64 encB = TFHE.asEuint64(b, bProof);
        lastComparisonResult = TFHE.lt(encA, encB);
        TFHE.allowThis(lastComparisonResult);
        TFHE.allow(lastComparisonResult, owner);
    }

    /**
     * @notice Checks if a is greater than or equal to b
     */
    function isGreaterOrEqual(
        einput a, bytes calldata aProof,
        einput b, bytes calldata bProof
    ) external {
        euint64 encA = TFHE.asEuint64(a, aProof);
        euint64 encB = TFHE.asEuint64(b, bProof);
        lastComparisonResult = TFHE.ge(encA, encB);
        TFHE.allowThis(lastComparisonResult);
        TFHE.allow(lastComparisonResult, owner);
    }

    /**
     * @notice Checks if a is less than or equal to b
     */
    function isLessOrEqual(
        einput a, bytes calldata aProof,
        einput b, bytes calldata bProof
    ) external {
        euint64 encA = TFHE.asEuint64(a, aProof);
        euint64 encB = TFHE.asEuint64(b, bProof);
        lastComparisonResult = TFHE.le(encA, encB);
        TFHE.allowThis(lastComparisonResult);
        TFHE.allow(lastComparisonResult, owner);
    }

    function getLastResult() external view returns (ebool) {
        return lastComparisonResult;
    }
}