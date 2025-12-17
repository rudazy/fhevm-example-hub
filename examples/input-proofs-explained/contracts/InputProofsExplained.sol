// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "fhevm/lib/TFHE.sol";


/**
 * @title InputProofsExplained
 * @author FHEVM Example Hub
 * @notice Explains the importance of input proofs in FHEVM
 * @dev Input proofs ensure:
 *      1. The encrypted value was created by the claimed sender
 *      2. The ciphertext is valid and not malformed
 *      3. The encryption is for this specific contract
 * 
 * @custom:category access-control
 * @custom:difficulty intermediate
 */
contract InputProofsExplained {
    
    mapping(address => euint64) private deposits;
    uint256 public totalDepositors;
    
    event DepositMade(address indexed user);
    event WithdrawalMade(address indexed user);

    /**
     * @notice Make a deposit with proper proof verification
     */
    function deposit(einput encryptedAmount, bytes calldata inputProof) external {
        euint64 amount = TFHE.asEuint64(encryptedAmount, inputProof);
        
        if (!TFHE.isInitialized(deposits[msg.sender])) {
            totalDepositors++;
        }
        
        if (TFHE.isInitialized(deposits[msg.sender])) {
            deposits[msg.sender] = TFHE.add(deposits[msg.sender], amount);
        } else {
            deposits[msg.sender] = amount;
        }
        
        TFHE.allow(deposits[msg.sender], address(this));
        TFHE.allow(deposits[msg.sender], msg.sender);
        
        emit DepositMade(msg.sender);
    }

    /**
     * @notice Withdraw with proof verification
     */
    function withdraw(einput encryptedAmount, bytes calldata inputProof) external {
        require(TFHE.isInitialized(deposits[msg.sender]), "No deposit found");
        
        euint64 amount = TFHE.asEuint64(encryptedAmount, inputProof);
        deposits[msg.sender] = TFHE.sub(deposits[msg.sender], amount);
        
        TFHE.allow(deposits[msg.sender], address(this));
        TFHE.allow(deposits[msg.sender], msg.sender);
        
        emit WithdrawalMade(msg.sender);
    }

    /**
     * @notice Get encrypted deposit balance
     */
    function getDeposit() external view returns (euint64) {
        return deposits[msg.sender];
    }

    /**
     * @notice Check if user has made a deposit
     */
    function hasDeposit() external view returns (bool) {
        return TFHE.isInitialized(deposits[msg.sender]);
    }
}