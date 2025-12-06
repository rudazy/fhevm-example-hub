// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "fhevm/lib/TFHE.sol";
import "fhevm/config/ZamaFHEVMConfig.sol";

/**
 * @title AccessControlTransient
 * @author FHEVM Example Hub
 * @notice Demonstrates transient access control
 * @dev This example shows how to:
 *      - Use TFHE.allowTransient() for temporary access
 *      - Grant access only for the duration of a transaction
 * 
 * @custom:category access-control
 * @custom:difficulty intermediate
 */
contract AccessControlTransient is SepoliaZamaFHEVMConfig {
    
    mapping(address => euint64) private balances;
    
    event Deposit(address indexed user);
    event TransferProcessed(address indexed from, address indexed to);

    /**
     * @notice Deposit encrypted tokens
     */
    function deposit(einput amount, bytes calldata proof) external {
        euint64 depositAmount = TFHE.asEuint64(amount, proof);
        
        if (TFHE.isInitialized(balances[msg.sender])) {
            balances[msg.sender] = TFHE.add(balances[msg.sender], depositAmount);
        } else {
            balances[msg.sender] = depositAmount;
        }
        
        TFHE.allowThis(balances[msg.sender]);
        TFHE.allow(balances[msg.sender], msg.sender);
        
        emit Deposit(msg.sender);
    }

    /**
     * @notice Transfer tokens using transient access
     */
    function transfer(address to, einput amount, bytes calldata proof) external {
        require(to != address(0), "Invalid recipient");
        require(to != msg.sender, "Cannot transfer to self");
        
        euint64 transferAmount = TFHE.asEuint64(amount, proof);
        
        balances[msg.sender] = TFHE.sub(balances[msg.sender], transferAmount);
        
        if (TFHE.isInitialized(balances[to])) {
            balances[to] = TFHE.add(balances[to], transferAmount);
        } else {
            balances[to] = transferAmount;
        }
        
        TFHE.allowThis(balances[msg.sender]);
        TFHE.allow(balances[msg.sender], msg.sender);
        TFHE.allowThis(balances[to]);
        TFHE.allow(balances[to], to);
        
        // Grant transient access to recipient for this transaction only
        TFHE.allowTransient(transferAmount, to);
        
        emit TransferProcessed(msg.sender, to);
    }

    /**
     * @notice Get your encrypted balance
     */
    function getBalance() external view returns (euint64) {
        return balances[msg.sender];
    }

    /**
     * @notice Check if user has a balance
     */
    function hasBalance() external view returns (bool) {
        return TFHE.isInitialized(balances[msg.sender]);
    }
}