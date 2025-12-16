// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@fhevm/solidity/lib/TFHE.sol";
import "@fhevm/solidity/config/ZamaFHEVMConfig.sol";
import "@fhevm/solidity/config/ZamaGatewayConfig.sol";
import "@fhevm/solidity/gateway/GatewayCaller.sol";

/**
 * @title PublicDecryptMultiple
 * @author FHEVM Example Hub
 * @notice Demonstrates public decryption of multiple values
 * @dev This example shows how to:
 *      - Decrypt multiple values publicly at once
 *      - Store multiple decrypted results
 *      - Use case: revealing election results
 * 
 * @custom:category decryption
 * @custom:difficulty advanced
 */
contract PublicDecryptMultiple is SepoliaZamaFHEVMConfig, SepoliaZamaGatewayConfig, GatewayCaller {
    
    euint64 private encryptedVotesA;
    euint64 private encryptedVotesB;
    euint64 private encryptedVotesC;
    
    uint64 public votesA;
    uint64 public votesB;
    uint64 public votesC;
    bool public resultsRevealed;
    
    address public owner;
    
    event VoteCast(address indexed voter);
    event ResultsRequested(uint256 requestId);
    event ResultsRevealed(uint64 votesA, uint64 votesB, uint64 votesC);

    constructor() {
        owner = msg.sender;
        encryptedVotesA = TFHE.asEuint64(0);
        encryptedVotesB = TFHE.asEuint64(0);
        encryptedVotesC = TFHE.asEuint64(0);
        TFHE.allowThis(encryptedVotesA);
        TFHE.allowThis(encryptedVotesB);
        TFHE.allowThis(encryptedVotesC);
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    /**
     * @notice Cast an encrypted vote for a candidate
     * @param candidate 0=A, 1=B, 2=C (encrypted)
     */
    function vote(einput candidate, bytes calldata proof) external {
        euint64 choice = TFHE.asEuint64(candidate, proof);
        
        // Add 1 to the chosen candidate using select
        ebool isA = TFHE.eq(choice, TFHE.asEuint64(0));
        ebool isB = TFHE.eq(choice, TFHE.asEuint64(1));
        ebool isC = TFHE.eq(choice, TFHE.asEuint64(2));
        
        euint64 one = TFHE.asEuint64(1);
        euint64 zero = TFHE.asEuint64(0);
        
        encryptedVotesA = TFHE.add(encryptedVotesA, TFHE.select(isA, one, zero));
        encryptedVotesB = TFHE.add(encryptedVotesB, TFHE.select(isB, one, zero));
        encryptedVotesC = TFHE.add(encryptedVotesC, TFHE.select(isC, one, zero));
        
        TFHE.allowThis(encryptedVotesA);
        TFHE.allowThis(encryptedVotesB);
        TFHE.allowThis(encryptedVotesC);
        
        emit VoteCast(msg.sender);
    }

    /**
     * @notice Reveal all election results
     */
    function revealResults() external onlyOwner returns (uint256) {
        require(!resultsRevealed, "Already revealed");
        
        uint256[] memory cts = new uint256[](3);
        cts[0] = Gateway.toUint256(encryptedVotesA);
        cts[1] = Gateway.toUint256(encryptedVotesB);
        cts[2] = Gateway.toUint256(encryptedVotesC);
        
        uint256 requestId = Gateway.requestDecryption(
            cts,
            this.resultsCallback.selector,
            0,
            block.timestamp + 100,
            false
        );
        
        emit ResultsRequested(requestId);
        return requestId;
    }

    /**
     * @notice Callback with all vote counts
     */
    function resultsCallback(
        uint256,
        uint64 _votesA,
        uint64 _votesB,
        uint64 _votesC
    ) external onlyGateway {
        votesA = _votesA;
        votesB = _votesB;
        votesC = _votesC;
        resultsRevealed = true;
        emit ResultsRevealed(_votesA, _votesB, _votesC);
    }

    /**
     * @notice Get election results (only after reveal)
     */
    function getResults() external view returns (uint64, uint64, uint64) {
        require(resultsRevealed, "Results not revealed yet");
        return (votesA, votesB, votesC);
    }
}