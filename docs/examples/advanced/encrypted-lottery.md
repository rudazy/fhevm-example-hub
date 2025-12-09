# Encrypted Lottery

> **Category:** advanced
> **Difficulty:** advanced

A lottery system where ticket numbers remain encrypted until the draw

## Overview

This example shows:
- Encrypted ticket purchases
- Encrypted winning number generation
- Private winner verification


## Contract: EncryptedLottery

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "fhevm/lib/TFHE.sol";
import "fhevm/config/ZamaFHEVMConfig.sol";
import "fhevm/config/ZamaGatewayConfig.sol";
import "fhevm/gateway/GatewayCaller.sol";

/**
 * @title EncryptedLottery
 * @author FHEVM Example Hub
 * @notice A lottery where ticket selections are encrypted
 * @dev This example shows:
 *      - Encrypted ticket purchases
 *      - Encrypted winning number generation
 *      - Private winner verification
 * 
 * @custom:category advanced
 * @custom:difficulty advanced
 */
contract EncryptedLottery is SepoliaZamaFHEVMConfig, SepoliaZamaGatewayConfig, GatewayCaller {
    
    address public operator;
    uint256 public ticketPrice;
    uint256 public drawTime;
    bool public drawn;
    
    euint64 private winningNumber;
    
    mapping(address => euint64) private tickets;
    mapping(address => bool) public hasTicket;
    address[] public participants;
    
    // Winner tracking
    address public winner;
    uint64 public revealedWinningNumber;
    
    event TicketPurchased(address indexed player);
    event LotteryDrawn();
    event WinnerFound(address indexed winner);
    event NoWinner();

    constructor(uint256 _ticketPrice, uint256 _duration) {
        operator = msg.sender;
        ticketPrice = _ticketPrice;
        drawTime = block.timestamp + _duration;
    }

    modifier onlyOperator() {
        require(msg.sender == operator, "Only operator");
        _;
    }

    modifier beforeDraw() {
        require(block.timestamp < drawTime, "Lottery closed");
        require(!drawn, "Already drawn");
        _;
    }

    modifier afterDrawTime() {
        require(block.timestamp >= drawTime, "Draw time not reached");
        _;
    }

    /**
     * @notice Buy a lottery ticket with an encrypted number
     * @param encryptedNumber Your secret lottery number (1-100)
     * @param proof Input proof
     */
    function buyTicket(einput encryptedNumber, bytes calldata proof) external payable beforeDraw {
        require(msg.value >= ticketPrice, "Insufficient payment");
        require(!hasTicket[msg.sender], "Already has ticket");
        
        euint64 number = TFHE.asEuint64(encryptedNumber, proof);
        
        tickets[msg.sender] = number;
        hasTicket[msg.sender] = true;
        participants.push(msg.sender);
        
        TFHE.allowThis(number);
        TFHE.allow(number, msg.sender);
        
        emit TicketPurchased(msg.sender);
    }

    /**
     * @notice Draw the lottery
     * @param encryptedWinning The winning number (encrypted by operator)
     * @param proof Input proof
     */
    function draw(einput encryptedWinning, bytes calldata proof) external onlyOperator afterDrawTime {
        require(!drawn, "Already drawn");
        
        winningNumber = TFHE.asEuint64(encryptedWinning, proof);
        TFHE.allowThis(winningNumber);
        drawn = true;
        
        emit LotteryDrawn();
    }

    /**
     * @notice Check if you won (returns encrypted boolean)
     */
    function checkMyTicket() external view returns (ebool) {
        require(drawn, "Not drawn yet");
        require(hasTicket[msg.sender], "No ticket");
        
        return TFHE.eq(tickets[msg.sender], winningNumber);
    }

    /**
     * @notice Claim prize if you won
     */
    function claimPrize() external {
        require(drawn, "Not drawn yet");
        require(hasTicket[msg.sender], "No ticket");
        require(winner == address(0), "Prize already claimed");
        
        ebool isWinner = TFHE.eq(tickets[msg.sender], winningNumber);
        
        // Note: In production, you'd need async decryption
        // This is simplified for demonstration
        
        // The winner would need to prove they won through decryption
    }

    /**
     * @notice Request reveal of winning number
     */
    function revealWinningNumber() external onlyOperator returns (uint256) {
        require(drawn, "Not drawn yet");
        
        uint256[] memory cts = new uint256[](1);
        cts[0] = Gateway.toUint256(winningNumber);
        
        uint256 requestId = Gateway.requestDecryption(
            cts,
            this.revealCallback.selector,
            0,
            block.timestamp + 100,
            false
        );
        
        return requestId;
    }

    /**
     * @notice Callback with revealed winning number
     */
    function revealCallback(uint256, uint64 number) external onlyGateway {
        revealedWinningNumber = number;
    }

    /**
     * @notice Get your encrypted ticket number
     */
    function getMyTicket() external view returns (euint64) {
        require(hasTicket[msg.sender], "No ticket");
        return tickets[msg.sender];
    }

    /**
     * @notice Get lottery info
     */
    function getLotteryInfo() external view returns (
        uint256 price,
        uint256 endTime,
        uint256 participantCount,
        bool isDrawn
    ) {
        return (ticketPrice, drawTime, participants.length, drawn);
    }

    /**
     * @notice Get prize pool
     */
    function getPrizePool() external view returns (uint256) {
        return address(this).balance;
    }
}
```

## Key Concepts

- Encrypted ticket purchases
- Encrypted winning number generation
- Private winner verification

## How to Run

```bash
cd examples/encrypted-lottery
npm install
npm run compile
npm run test
```

## Related Examples

- Check other examples in the Advanced Examples category

