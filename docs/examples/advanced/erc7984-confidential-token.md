# Erc7984 Confidential Token

> **Category:** advanced
> **Difficulty:** advanced

ERC7984 confidential token implementation with encrypted balances

## Overview

This example shows:
- Encrypted token balances
- Confidential transfers
- Private allowance management


## Contract: ConfidentialToken

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "fhevm/lib/TFHE.sol";
import "fhevm/config/ZamaFHEVMConfig.sol";

/**
 * @title ConfidentialToken
 * @author FHEVM Example Hub
 * @notice ERC7984-style confidential token with encrypted balances
 * @dev This example shows:
 *      - Encrypted token balances
 *      - Confidential transfers
 *      - Private allowance management
 * 
 * @custom:category advanced
 * @custom:difficulty advanced
 */
contract ConfidentialToken is SepoliaZamaFHEVMConfig {
    
    string public name;
    string public symbol;
    uint8 public decimals;
    
    // Encrypted balances
    mapping(address => euint64) private _balances;
    
    // Encrypted allowances
    mapping(address => mapping(address => euint64)) private _allowances;
    
    // Total supply (public for simplicity, could be encrypted)
    uint256 public totalSupply;
    
    address public owner;
    
    event Transfer(address indexed from, address indexed to);
    event Approval(address indexed owner, address indexed spender);
    event Mint(address indexed to, uint256 amount);

    constructor(string memory _name, string memory _symbol) {
        name = _name;
        symbol = _symbol;
        decimals = 18;
        owner = msg.sender;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    /**
     * @notice Mint new tokens to an address
     * @param to Recipient address
     * @param amount Amount to mint (plaintext, will be encrypted)
     */
    function mint(address to, uint64 amount) external onlyOwner {
        euint64 encAmount = TFHE.asEuint64(amount);
        
        if (TFHE.isInitialized(_balances[to])) {
            _balances[to] = TFHE.add(_balances[to], encAmount);
        } else {
            _balances[to] = encAmount;
        }
        
        TFHE.allowThis(_balances[to]);
        TFHE.allow(_balances[to], to);
        
        totalSupply += amount;
        emit Mint(to, amount);
    }

    /**
     * @notice Transfer tokens confidentially
     * @param to Recipient address
     * @param encryptedAmount Encrypted transfer amount
     * @param inputProof Proof for the encrypted input
     */
    function transfer(
        address to,
        einput encryptedAmount,
        bytes calldata inputProof
    ) external returns (bool) {
        require(to != address(0), "Transfer to zero address");
        require(to != msg.sender, "Transfer to self");
        
        euint64 amount = TFHE.asEuint64(encryptedAmount, inputProof);
        
        // Subtract from sender
        _balances[msg.sender] = TFHE.sub(_balances[msg.sender], amount);
        
        // Add to recipient
        if (TFHE.isInitialized(_balances[to])) {
            _balances[to] = TFHE.add(_balances[to], amount);
        } else {
            _balances[to] = amount;
        }
        
        // Update permissions
        TFHE.allowThis(_balances[msg.sender]);
        TFHE.allow(_balances[msg.sender], msg.sender);
        TFHE.allowThis(_balances[to]);
        TFHE.allow(_balances[to], to);
        
        emit Transfer(msg.sender, to);
        return true;
    }

    /**
     * @notice Approve spender to use tokens
     * @param spender Address to approve
     * @param encryptedAmount Encrypted allowance amount
     * @param inputProof Proof for the encrypted input
     */
    function approve(
        address spender,
        einput encryptedAmount,
        bytes calldata inputProof
    ) external returns (bool) {
        require(spender != address(0), "Approve zero address");
        
        euint64 amount = TFHE.asEuint64(encryptedAmount, inputProof);
        _allowances[msg.sender][spender] = amount;
        
        TFHE.allowThis(amount);
        TFHE.allow(amount, msg.sender);
        TFHE.allow(amount, spender);
        
        emit Approval(msg.sender, spender);
        return true;
    }

    /**
     * @notice Transfer tokens from another address (using allowance)
     * @param from Source address
     * @param to Destination address
     * @param encryptedAmount Encrypted transfer amount
     * @param inputProof Proof for the encrypted input
     */
    function transferFrom(
        address from,
        address to,
        einput encryptedAmount,
        bytes calldata inputProof
    ) external returns (bool) {
        require(to != address(0), "Transfer to zero address");
        
        euint64 amount = TFHE.asEuint64(encryptedAmount, inputProof);
        
        // Reduce allowance
        _allowances[from][msg.sender] = TFHE.sub(_allowances[from][msg.sender], amount);
        
        // Subtract from sender
        _balances[from] = TFHE.sub(_balances[from], amount);
        
        // Add to recipient
        if (TFHE.isInitialized(_balances[to])) {
            _balances[to] = TFHE.add(_balances[to], amount);
        } else {
            _balances[to] = amount;
        }
        
        // Update permissions
        TFHE.allowThis(_balances[from]);
        TFHE.allow(_balances[from], from);
        TFHE.allowThis(_balances[to]);
        TFHE.allow(_balances[to], to);
        TFHE.allowThis(_allowances[from][msg.sender]);
        TFHE.allow(_allowances[from][msg.sender], from);
        TFHE.allow(_allowances[from][msg.sender], msg.sender);
        
        emit Transfer(from, to);
        return true;
    }

    /**
     * @notice Get your encrypted balance
     */
    function balanceOf() external view returns (euint64) {
        return _balances[msg.sender];
    }

    /**
     * @notice Get encrypted allowance
     */
    function allowance(address spender) external view returns (euint64) {
        return _allowances[msg.sender][spender];
    }

    /**
     * @notice Check if address has balance
     */
    function hasBalance(address account) external view returns (bool) {
        return TFHE.isInitialized(_balances[account]);
    }
}
```

## Key Concepts

- Encrypted token balances
- Confidential transfers
- Private allowance management

## How to Run

```bash
cd examples/erc7984-confidential-token
npm install
npm run compile
npm run test
```

## Related Examples

- Check other examples in the Advanced Examples category

