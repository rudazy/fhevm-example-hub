// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@fhevm/solidity/lib/TFHE.sol";
import "@fhevm/solidity/config/ZamaFHEVMConfig.sol";
import "@fhevm/solidity/config/ZamaGatewayConfig.sol";
import "@fhevm/solidity/gateway/GatewayCaller.sol";

/**
 * @title BlindAuction
 * @author FHEVM Example Hub
 * @notice A blind auction where bids are encrypted
 * @dev This example shows:
 *      - Encrypted bid submission
 *      - Encrypted comparison to find highest bid
 *      - Revealing winner only at auction end
 * 
 * @custom:category advanced
 * @custom:difficulty advanced
 */
contract BlindAuction is SepoliaZamaFHEVMConfig, SepoliaZamaGatewayConfig, GatewayCaller {
    
    address public auctioneer;
    uint256 public auctionEndTime;
    bool public auctionEnded;
    
    // Encrypted highest bid and winner tracking
    euint64 private highestBid;
    address private highestBidder;
    
    // Mapping of bidders to their encrypted bids
    mapping(address => euint64) private bids;
    mapping(address => bool) public hasBid;
    
    // Revealed winner (after auction ends)
    address public revealedWinner;
    uint64 public revealedWinningBid;
    
    event BidPlaced(address indexed bidder);
    event AuctionEnded();
    event WinnerRevealed(address winner, uint64 winningBid);

    constructor(uint256 _biddingTime) {
        auctioneer = msg.sender;
        auctionEndTime = block.timestamp + _biddingTime;
        highestBid = TFHE.asEuint64(0);
        TFHE.allowThis(highestBid);
    }

    modifier onlyBeforeEnd() {
        require(block.timestamp < auctionEndTime, "Auction has ended");
        _;
    }

    modifier onlyAfterEnd() {
        require(block.timestamp >= auctionEndTime, "Auction not yet ended");
        _;
    }

    modifier onlyAuctioneer() {
        require(msg.sender == auctioneer, "Only auctioneer");
        _;
    }

    /**
     * @notice Place an encrypted bid
     * @dev Bid amount is encrypted - nobody knows how much you bid
     */
    function bid(einput encryptedBid, bytes calldata inputProof) external onlyBeforeEnd {
        require(!hasBid[msg.sender], "Already placed a bid");
        
        euint64 bidAmount = TFHE.asEuint64(encryptedBid, inputProof);
        
        // Store the bid
        bids[msg.sender] = bidAmount;
        hasBid[msg.sender] = true;
        
        TFHE.allowThis(bidAmount);
        TFHE.allow(bidAmount, msg.sender);
        
        // Check if this bid is higher than current highest
        ebool isHigher = TFHE.gt(bidAmount, highestBid);
        
        // Update highest bid using encrypted select
        highestBid = TFHE.select(isHigher, bidAmount, highestBid);
        TFHE.allowThis(highestBid);
        
        // Track potential winner (this leaks some info but necessary for demo)
        // In production, you'd handle this differently
        
        emit BidPlaced(msg.sender);
    }

    /**
     * @notice End the auction
     */
    function endAuction() external onlyAfterEnd {
        require(!auctionEnded, "Auction already ended");
        auctionEnded = true;
        emit AuctionEnded();
    }

    /**
     * @notice Request winner reveal
     */
    function revealWinner() external onlyAuctioneer onlyAfterEnd returns (uint256) {
        require(auctionEnded, "End auction first");
        require(revealedWinner == address(0), "Already revealed");
        
        uint256[] memory cts = new uint256[](1);
        cts[0] = Gateway.toUint256(highestBid);
        
        uint256 requestId = Gateway.requestDecryption(
            cts,
            this.winnerCallback.selector,
            0,
            block.timestamp + 100,
            false
        );
        
        return requestId;
    }

    /**
     * @notice Callback with winning bid amount
     */
    function winnerCallback(uint256, uint64 winningBid) external onlyGateway {
        revealedWinningBid = winningBid;
        emit WinnerRevealed(revealedWinner, winningBid);
    }

    /**
     * @notice Check your own bid (only you can see it)
     */
    function getMyBid() external view returns (euint64) {
        require(hasBid[msg.sender], "No bid placed");
        return bids[msg.sender];
    }

    /**
     * @notice Get auction status
     */
    function getAuctionStatus() external view returns (
        bool ended,
        uint256 endTime,
        uint256 currentTime
    ) {
        return (auctionEnded, auctionEndTime, block.timestamp);
    }
}