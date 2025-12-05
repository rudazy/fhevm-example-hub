// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "fhevm/lib/TFHE.sol";
import "fhevm/config/ZamaFHEVMConfig.sol";
import "fhevm/config/ZamaGatewayConfig.sol";
import "fhevm/gateway/GatewayCaller.sol";

/**
 * @title PublicDecryptSingle
 * @author FHEVM Example Hub
 * @notice Demonstrates public decryption where anyone can see the result
 * @dev This example shows how to:
 *      - Perform public decryption (result stored on-chain)
 *      - Use decrypted values in contract logic
 *      - Handle the async nature of decryption
 * 
 * @custom:category decryption
 * @custom:difficulty intermediate
 */
contract PublicDecryptSingle is SepoliaZamaFHEVMConfig, SepoliaZamaGatewayConfig, GatewayCaller {
    
    euint64 private encryptedTotal;
    uint64 public decryptedTotal;
    bool public isDecrypted;
    address public owner;
    
    event ContributionAdded(address indexed contributor);
    event DecryptionRequested(uint256 requestId);
    event TotalRevealed(uint64 total);

    constructor() {
        owner = msg.sender;
        encryptedTotal = TFHE.asEuint64(0);
        TFHE.allowThis(encryptedTotal);
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    /**
     * @notice Add an encrypted contribution to the total
     */
    function addContribution(einput encryptedAmount, bytes calldata inputProof) external {
        euint64 amount = TFHE.asEuint64(encryptedAmount, inputProof);
        encryptedTotal = TFHE.add(encryptedTotal, amount);
        TFHE.allowThis(encryptedTotal);
        emit ContributionAdded(msg.sender);
    }

    /**
     * @notice Request public decryption of the total
     * @dev Once decrypted, the value is visible to everyone
     */
    function revealTotal() external onlyOwner returns (uint256) {
        require(!isDecrypted, "Already decrypted");
        
        uint256[] memory cts = new uint256[](1);
        cts[0] = Gateway.toUint256(encryptedTotal);
        
        uint256 requestId = Gateway.requestDecryption(
            cts,
            this.revealCallback.selector,
            0,
            block.timestamp + 100,
            false
        );
        
        emit DecryptionRequested(requestId);
        return requestId;
    }

    /**
     * @notice Callback that stores the decrypted value publicly
     */
    function revealCallback(uint256, uint64 total) external onlyGateway {
        decryptedTotal = total;
        isDecrypted = true;
        emit TotalRevealed(total);
    }

    /**
     * @notice Get the public total (only available after decryption)
     */
    function getTotal() external view returns (uint64) {
        require(isDecrypted, "Not yet decrypted");
        return decryptedTotal;
    }
}