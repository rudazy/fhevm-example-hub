// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "fhevm/lib/TFHE.sol";


import "fhevm/gateway/GatewayCaller.sol";
import "fhevm/gateway/lib/Gateway.sol";

/**
 * @title ConfidentialNFT
 * @author FHEVM Example Hub
 * @notice NFT with encrypted metadata
 * @dev This example shows:
 *      - Storing encrypted NFT attributes
 *      - Owner-only access to metadata
 *      - Optional public reveal
 * 
 * @custom:category advanced
 * @custom:difficulty advanced
 */
contract ConfidentialNFT is GatewayCaller {
    
    struct NFTMetadata {
        euint64 rarity;      // 1-100 rarity score
        euint64 power;       // Power attribute
        euint64 secretCode;  // Hidden code
        bool revealed;
    }
    
    mapping(uint256 => address) public ownerOf;
    mapping(uint256 => NFTMetadata) private metadata;
    mapping(address => uint256) public balanceOf;
    
    // Revealed metadata (after public reveal)
    mapping(uint256 => uint64) public revealedRarity;
    mapping(uint256 => uint64) public revealedPower;
    
    uint256 public totalSupply;
    address public minter;
    
    event Mint(address indexed to, uint256 indexed tokenId);
    event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);
    event MetadataRevealed(uint256 indexed tokenId, uint64 rarity, uint64 power);

    constructor() {
        minter = msg.sender;
    }

    modifier onlyMinter() {
        require(msg.sender == minter, "Only minter");
        _;
    }

    modifier onlyOwnerOf(uint256 tokenId) {
        require(ownerOf[tokenId] == msg.sender, "Not owner");
        _;
    }

    /**
     * @notice Mint a new NFT with encrypted attributes
     */
    function mint(
        address to,
        einput encRarity, bytes calldata proofRarity,
        einput encPower, bytes calldata proofPower,
        einput encSecret, bytes calldata proofSecret
    ) external onlyMinter returns (uint256) {
        uint256 tokenId = totalSupply++;
        
        euint64 rarity = TFHE.asEuint64(encRarity, proofRarity);
        euint64 power = TFHE.asEuint64(encPower, proofPower);
        euint64 secretCode = TFHE.asEuint64(encSecret, proofSecret);
        
        metadata[tokenId] = NFTMetadata({
            rarity: rarity,
            power: power,
            secretCode: secretCode,
            revealed: false
        });
        
        // Set permissions
        TFHE.allow(rarity, address(this));
        TFHE.allow(power, address(this));
        TFHE.allow(secretCode, address(this));
        TFHE.allow(rarity, to);
        TFHE.allow(power, to);
        TFHE.allow(secretCode, to);
        
        ownerOf[tokenId] = to;
        balanceOf[to]++;
        
        emit Mint(to, tokenId);
        return tokenId;
    }

    /**
     * @notice Transfer NFT to new owner
     */
    function transfer(address to, uint256 tokenId) external onlyOwnerOf(tokenId) {
        require(to != address(0), "Invalid recipient");
        
        address from = msg.sender;
        
        ownerOf[tokenId] = to;
        balanceOf[from]--;
        balanceOf[to]++;
        
        // Update permissions for new owner
        NFTMetadata storage meta = metadata[tokenId];
        TFHE.allow(meta.rarity, to);
        TFHE.allow(meta.power, to);
        TFHE.allow(meta.secretCode, to);
        
        emit Transfer(from, to, tokenId);
    }

    /**
     * @notice Get encrypted rarity (only owner)
     */
    function getRarity(uint256 tokenId) external view onlyOwnerOf(tokenId) returns (euint64) {
        return metadata[tokenId].rarity;
    }

    /**
     * @notice Get encrypted power (only owner)
     */
    function getPower(uint256 tokenId) external view onlyOwnerOf(tokenId) returns (euint64) {
        return metadata[tokenId].power;
    }

    /**
     * @notice Get encrypted secret code (only owner)
     */
    function getSecretCode(uint256 tokenId) external view onlyOwnerOf(tokenId) returns (euint64) {
        return metadata[tokenId].secretCode;
    }

    /**
     * @notice Request public reveal of rarity and power
     */
    function requestReveal(uint256 tokenId) external onlyOwnerOf(tokenId) returns (uint256) {
        require(!metadata[tokenId].revealed, "Already revealed");
        
        NFTMetadata storage meta = metadata[tokenId];
        
        uint256[] memory cts = new uint256[](2);
        cts[0] = Gateway.toUint256(meta.rarity);
        cts[1] = Gateway.toUint256(meta.power);
        
        uint256 requestId = Gateway.requestDecryption(
            cts,
            this.revealCallback.selector,
            tokenId,
            block.timestamp + 100,
            false
        );
        
        return requestId;
    }

    /**
     * @notice Callback for reveal
     */
    function revealCallback(
        uint256 requestId,
        uint64 rarity,
        uint64 power
    ) external onlyGateway {
        // Note: In production, map requestId to tokenId properly
        uint256 tokenId = 0;
        
        revealedRarity[tokenId] = rarity;
        revealedPower[tokenId] = power;
        metadata[tokenId].revealed = true;
        
        emit MetadataRevealed(tokenId, rarity, power);
    }

    /**
     * @notice Check if metadata is revealed
     */
    function isRevealed(uint256 tokenId) external view returns (bool) {
        return metadata[tokenId].revealed;
    }
}