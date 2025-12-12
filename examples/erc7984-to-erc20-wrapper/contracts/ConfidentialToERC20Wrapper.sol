// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "fhevm/lib/TFHE.sol";
import "fhevm/config/ZamaFHEVMConfig.sol";
import "fhevm/config/ZamaGatewayConfig.sol";
import "fhevm/gateway/GatewayCaller.sol";

/**
 * @title ConfidentialToERC20Wrapper
 * @author FHEVM Example Hub
 * @notice Wraps confidential tokens to standard ERC20 and vice versa
 * @dev This example shows:
 *      - Converting encrypted balances to public ERC20
 *      - Converting public ERC20 to encrypted balances
 *      - Gateway decryption for unwrapping
 * 
 * @custom:category advanced
 * @custom:difficulty advanced
 */
contract ConfidentialToERC20Wrapper is SepoliaZamaFHEVMConfig, SepoliaZamaGatewayConfig, GatewayCaller {
    
    string public name = "Wrapped Confidential Token";
    string public symbol = "WCTKN";
    uint8 public decimals = 18;
    
    // Public ERC20 balances
    mapping(address => uint256) public publicBalances;
    uint256 public publicTotalSupply;
    
    // Encrypted balances
    mapping(address => euint64) private encryptedBalances;
    
    // Pending unwrap requests
    mapping(uint256 => address) private unwrapRequests;
    mapping(uint256 => uint64) private unwrapAmounts;
    
    address public owner;
    
    event Wrap(address indexed user, uint256 amount);
    event UnwrapRequested(address indexed user, uint256 requestId);
    event UnwrapCompleted(address indexed user, uint256 amount);
    event Transfer(address indexed from, address indexed to, uint256 value);

    constructor() {
        owner = msg.sender;
    }

    /**
     * @notice Wrap public tokens to encrypted tokens
     * @param amount Amount to wrap (public)
     */
    function wrap(uint256 amount) external {
        require(publicBalances[msg.sender] >= amount, "Insufficient public balance");
        
        // Reduce public balance
        publicBalances[msg.sender] -= amount;
        publicTotalSupply -= amount;
        
        // Add to encrypted balance
        euint64 encAmount = TFHE.asEuint64(uint64(amount));
        
        if (TFHE.isInitialized(encryptedBalances[msg.sender])) {
            encryptedBalances[msg.sender] = TFHE.add(encryptedBalances[msg.sender], encAmount);
        } else {
            encryptedBalances[msg.sender] = encAmount;
        }
        
        TFHE.allowThis(encryptedBalances[msg.sender]);
        TFHE.allow(encryptedBalances[msg.sender], msg.sender);
        
        emit Wrap(msg.sender, amount);
    }

    /**
     * @notice Request unwrap from encrypted to public
     * @param encAmount Encrypted amount to unwrap
     * @param proof Input proof
     */
    function requestUnwrap(einput encAmount, bytes calldata proof) external returns (uint256) {
        euint64 amount = TFHE.asEuint64(encAmount, proof);
        
        // Subtract from encrypted balance
        encryptedBalances[msg.sender] = TFHE.sub(encryptedBalances[msg.sender], amount);
        TFHE.allowThis(encryptedBalances[msg.sender]);
        TFHE.allow(encryptedBalances[msg.sender], msg.sender);
        
        // Request decryption
        uint256[] memory cts = new uint256[](1);
        cts[0] = Gateway.toUint256(amount);
        
        uint256 requestId = Gateway.requestDecryption(
            cts,
            this.unwrapCallback.selector,
            0,
            block.timestamp + 100,
            false
        );
        
        unwrapRequests[requestId] = msg.sender;
        
        emit UnwrapRequested(msg.sender, requestId);
        return requestId;
    }

    /**
     * @notice Callback to complete unwrap
     */
    function unwrapCallback(uint256 requestId, uint64 amount) external onlyGateway {
        address user = unwrapRequests[requestId];
        
        // Add to public balance
        publicBalances[user] += amount;
        publicTotalSupply += amount;
        
        delete unwrapRequests[requestId];
        
        emit UnwrapCompleted(user, amount);
    }

    /**
     * @notice Mint public tokens (owner only, for testing)
     */
    function mintPublic(address to, uint256 amount) external {
        require(msg.sender == owner, "Only owner");
        publicBalances[to] += amount;
        publicTotalSupply += amount;
    }

    /**
     * @notice Get encrypted balance
     */
    function getEncryptedBalance() external view returns (euint64) {
        return encryptedBalances[msg.sender];
    }

    /**
     * @notice Standard ERC20 transfer (public tokens only)
     */
    function transfer(address to, uint256 amount) external returns (bool) {
        require(publicBalances[msg.sender] >= amount, "Insufficient balance");
        publicBalances[msg.sender] -= amount;
        publicBalances[to] += amount;
        emit Transfer(msg.sender, to, amount);
        return true;
    }

    /**
     * @notice Check public balance
     */
    function balanceOf(address account) external view returns (uint256) {
        return publicBalances[account];
    }
}