# Confidential Voting

> **Category:** advanced
> **Difficulty:** advanced

A voting system where votes are encrypted and tallied privately

## Overview

This example shows:
- Encrypted vote casting
- Tallying without revealing individual votes
- Final result revelation


## Contract: ConfidentialVoting

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "fhevm/lib/TFHE.sol";
import "fhevm/config/ZamaFHEVMConfig.sol";
import "fhevm/config/ZamaGatewayConfig.sol";
import "fhevm/gateway/GatewayCaller.sol";

/**
 * @title ConfidentialVoting
 * @author FHEVM Example Hub
 * @notice A voting system with encrypted votes
 * @dev This example shows:
 *      - Encrypted vote casting
 *      - Tallying without revealing individual votes
 *      - Final result revelation
 * 
 * @custom:category advanced
 * @custom:difficulty advanced
 */
contract ConfidentialVoting is SepoliaZamaFHEVMConfig, SepoliaZamaGatewayConfig, GatewayCaller {
    
    struct Proposal {
        string description;
        euint64 yesVotes;
        euint64 noVotes;
        bool exists;
    }
    
    address public admin;
    uint256 public proposalCount;
    bool public votingOpen;
    
    mapping(uint256 => Proposal) public proposals;
    mapping(uint256 => mapping(address => bool)) public hasVoted;
    
    // Revealed results
    mapping(uint256 => uint64) public revealedYesVotes;
    mapping(uint256 => uint64) public revealedNoVotes;
    mapping(uint256 => bool) public resultsRevealed;
    
    event ProposalCreated(uint256 indexed proposalId, string description);
    event VoteCast(uint256 indexed proposalId, address indexed voter);
    event VotingClosed();
    event ResultsRevealed(uint256 indexed proposalId, uint64 yesVotes, uint64 noVotes);

    constructor() {
        admin = msg.sender;
        votingOpen = true;
    }

    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin");
        _;
    }

    modifier whenVotingOpen() {
        require(votingOpen, "Voting is closed");
        _;
    }

    /**
     * @notice Create a new proposal
     */
    function createProposal(string calldata description) external onlyAdmin returns (uint256) {
        uint256 proposalId = proposalCount++;
        
        proposals[proposalId].description = description;
        proposals[proposalId].yesVotes = TFHE.asEuint64(0);
        proposals[proposalId].noVotes = TFHE.asEuint64(0);
        proposals[proposalId].exists = true;
        
        TFHE.allowThis(proposals[proposalId].yesVotes);
        TFHE.allowThis(proposals[proposalId].noVotes);
        
        emit ProposalCreated(proposalId, description);
        return proposalId;
    }

    /**
     * @notice Cast an encrypted vote
     * @param proposalId The proposal to vote on
     * @param encryptedVote Encrypted 1 for yes, 0 for no
     * @param proof Input proof
     */
    function vote(
        uint256 proposalId,
        einput encryptedVote,
        bytes calldata proof
    ) external whenVotingOpen {
        require(proposals[proposalId].exists, "Proposal does not exist");
        require(!hasVoted[proposalId][msg.sender], "Already voted");
        
        euint64 voteValue = TFHE.asEuint64(encryptedVote, proof);
        hasVoted[proposalId][msg.sender] = true;
        
        // Check if vote is 1 (yes) or 0 (no)
        euint64 one = TFHE.asEuint64(1);
        ebool isYes = TFHE.eq(voteValue, one);
        
        // Add to appropriate tally using select
        euint64 yesIncrement = TFHE.select(isYes, one, TFHE.asEuint64(0));
        euint64 noIncrement = TFHE.select(isYes, TFHE.asEuint64(0), one);
        
        proposals[proposalId].yesVotes = TFHE.add(proposals[proposalId].yesVotes, yesIncrement);
        proposals[proposalId].noVotes = TFHE.add(proposals[proposalId].noVotes, noIncrement);
        
        TFHE.allowThis(proposals[proposalId].yesVotes);
        TFHE.allowThis(proposals[proposalId].noVotes);
        
        emit VoteCast(proposalId, msg.sender);
    }

    /**
     * @notice Close voting
     */
    function closeVoting() external onlyAdmin {
        votingOpen = false;
        emit VotingClosed();
    }

    /**
     * @notice Request result revelation for a proposal
     */
    function revealResults(uint256 proposalId) external onlyAdmin returns (uint256) {
        require(!votingOpen, "Voting still open");
        require(proposals[proposalId].exists, "Proposal does not exist");
        require(!resultsRevealed[proposalId], "Already revealed");
        
        uint256[] memory cts = new uint256[](2);
        cts[0] = Gateway.toUint256(proposals[proposalId].yesVotes);
        cts[1] = Gateway.toUint256(proposals[proposalId].noVotes);
        
        uint256 requestId = Gateway.requestDecryption(
            cts,
            this.resultsCallback.selector,
            proposalId, // pass proposalId as metadata
            block.timestamp + 100,
            false
        );
        
        return requestId;
    }

    /**
     * @notice Callback with decrypted results
     */
    function resultsCallback(
        uint256 requestId,
        uint64 yesVotes,
        uint64 noVotes
    ) external onlyGateway {
        // Note: In production, you'd need to track proposalId properly
        // This is simplified for the example
        uint256 proposalId = 0; // Would come from request metadata
        
        revealedYesVotes[proposalId] = yesVotes;
        revealedNoVotes[proposalId] = noVotes;
        resultsRevealed[proposalId] = true;
        
        emit ResultsRevealed(proposalId, yesVotes, noVotes);
    }

    /**
     * @notice Get proposal info
     */
    function getProposal(uint256 proposalId) external view returns (
        string memory description,
        bool exists,
        bool revealed
    ) {
        Proposal storage p = proposals[proposalId];
        return (p.description, p.exists, resultsRevealed[proposalId]);
    }

    /**
     * @notice Get revealed results
     */
    function getResults(uint256 proposalId) external view returns (uint64 yes, uint64 no) {
        require(resultsRevealed[proposalId], "Results not revealed");
        return (revealedYesVotes[proposalId], revealedNoVotes[proposalId]);
    }
}
```

## Key Concepts

- Encrypted vote casting
- Tallying without revealing individual votes
- Final result revelation

## How to Run

```bash
cd examples/confidential-voting
npm install
npm run compile
npm run test
```

## Related Examples

- Check other examples in the Advanced Examples category

