// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "fhevm/lib/TFHE.sol";
import "fhevm/config/ZamaFHEVMConfig.sol";
import "fhevm/config/ZamaGatewayConfig.sol";
import "fhevm/gateway/GatewayCaller.sol";

/**
 * @title UserDecryptSingle
 * @author FHEVM Example Hub
 * @notice Demonstrates user-initiated decryption of a single value
 * @dev This example shows how to:
 *      - Request decryption via Gateway
 *      - Handle async decryption callbacks
 *      - Emit decrypted values in events
 * 
 * @custom:category decryption
 * @custom:difficulty intermediate
 */
contract UserDecryptSingle is SepoliaZamaFHEVMConfig, SepoliaZamaGatewayConfig, GatewayCaller {
    
    mapping(address => euint64) private userBalances;
    mapping(uint256 => address) private requestToUser;
    
    event BalanceStored(address indexed user);
    event DecryptionRequested(address indexed user, uint256 requestId);
    event BalanceDecrypted(address indexed user, uint64 balance);

    /**
     * @notice Store an encrypted balance
     */
    function storeBalance(einput encryptedBalance, bytes calldata inputProof) external {
        euint64 balance = TFHE.asEuint64(encryptedBalance, inputProof);
        userBalances[msg.sender] = balance;
        TFHE.allowThis(balance);
        TFHE.allow(balance, msg.sender);
        emit BalanceStored(msg.sender);
    }

    /**
     * @notice Request decryption of your balance
     * @return requestId The ID to track the decryption request
     */
    function requestMyBalanceDecryption() external returns (uint256) {
        require(TFHE.isInitialized(userBalances[msg.sender]), "No balance stored");
        
        uint256[] memory cts = new uint256[](1);
        cts[0] = Gateway.toUint256(userBalances[msg.sender]);
        
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
     * @notice Callback function called by Gateway with decrypted value
     * @param requestId The original request ID
     * @param decryptedBalance The decrypted balance value
     */
    function decryptionCallback(uint256 requestId, uint64 decryptedBalance) external onlyGateway {
        address user = requestToUser[requestId];
        emit BalanceDecrypted(user, decryptedBalance);
        delete requestToUser[requestId];
    }

    /**
     * @notice Get encrypted balance handle
     */
    function getMyBalance() external view returns (euint64) {
        return userBalances[msg.sender];
    }
}