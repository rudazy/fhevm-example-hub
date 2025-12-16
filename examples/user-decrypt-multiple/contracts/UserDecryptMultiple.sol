// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@fhevm/solidity/lib/TFHE.sol";
import "@fhevm/solidity/config/ZamaFHEVMConfig.sol";
import "@fhevm/solidity/config/ZamaGatewayConfig.sol";
import "@fhevm/solidity/gateway/GatewayCaller.sol";

/**
 * @title UserDecryptMultiple
 * @author FHEVM Example Hub
 * @notice Demonstrates decrypting multiple values at once
 * @dev This example shows how to:
 *      - Request decryption of multiple encrypted values
 *      - Handle multiple decrypted values in callback
 *      - Efficiently batch decryption requests
 * 
 * @custom:category decryption
 * @custom:difficulty intermediate
 */
contract UserDecryptMultiple is SepoliaZamaFHEVMConfig, SepoliaZamaGatewayConfig, GatewayCaller {
    
    struct EncryptedStats {
        euint64 health;
        euint64 attack;
        euint64 defense;
    }
    
    mapping(address => EncryptedStats) private userStats;
    mapping(uint256 => address) private requestToUser;
    
    event StatsStored(address indexed user);
    event DecryptionRequested(address indexed user, uint256 requestId);
    event StatsDecrypted(address indexed user, uint64 health, uint64 attack, uint64 defense);

    /**
     * @notice Store encrypted player stats
     */
    function storeStats(
        einput encHealth, bytes calldata proofHealth,
        einput encAttack, bytes calldata proofAttack,
        einput encDefense, bytes calldata proofDefense
    ) external {
        euint64 health = TFHE.asEuint64(encHealth, proofHealth);
        euint64 attack = TFHE.asEuint64(encAttack, proofAttack);
        euint64 defense = TFHE.asEuint64(encDefense, proofDefense);
        
        userStats[msg.sender] = EncryptedStats(health, attack, defense);
        
        TFHE.allowThis(health);
        TFHE.allowThis(attack);
        TFHE.allowThis(defense);
        TFHE.allow(health, msg.sender);
        TFHE.allow(attack, msg.sender);
        TFHE.allow(defense, msg.sender);
        
        emit StatsStored(msg.sender);
    }

    /**
     * @notice Request decryption of all stats at once
     */
    function requestStatsDecryption() external returns (uint256) {
        EncryptedStats storage stats = userStats[msg.sender];
        require(TFHE.isInitialized(stats.health), "No stats stored");
        
        // Request decryption of all three values at once
        uint256[] memory cts = new uint256[](3);
        cts[0] = Gateway.toUint256(stats.health);
        cts[1] = Gateway.toUint256(stats.attack);
        cts[2] = Gateway.toUint256(stats.defense);
        
        uint256 requestId = Gateway.requestDecryption(
            cts,
            this.decryptionCallback.selector,
            0,
            block.timestamp + 100,
            false
        );
        
        requestToUser[requestId] = msg.sender;
        emit DecryptionRequested(msg.sender, requestId);
        return requestId;
    }

    /**
     * @notice Callback with all decrypted values
     */
    function decryptionCallback(
        uint256 requestId,
        uint64 health,
        uint64 attack,
        uint64 defense
    ) external onlyGateway {
        address user = requestToUser[requestId];
        emit StatsDecrypted(user, health, attack, defense);
        delete requestToUser[requestId];
    }

    /**
     * @notice Get encrypted stats handles
     */
    function getMyStats() external view returns (euint64, euint64, euint64) {
        EncryptedStats storage stats = userStats[msg.sender];
        return (stats.health, stats.attack, stats.defense);
    }
}