import * as fs from 'fs-extra';
import * as path from 'path';

const EXAMPLES = [
  {
    name: 'handle-lifecycle',
    category: 'advanced',
    description: 'Demonstrates how encrypted handles are created, used, and managed throughout their lifecycle',
    contractName: 'HandleLifecycle',
    contract: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "fhevm/lib/TFHE.sol";
import "fhevm/config/ZamaFHEVMConfig.sol";

/**
 * @title HandleLifecycle
 * @author FHEVM Example Hub
 * @notice Demonstrates the lifecycle of encrypted handles
 * @dev This example shows:
 *      - How handles are created from encrypted inputs
 *      - How operations create new handles
 *      - How permissions must be managed for each handle
 *      - Handle persistence in storage
 * 
 * @custom:category advanced
 * @custom:difficulty intermediate
 */
contract HandleLifecycle is SepoliaZamaFHEVMConfig {
    
    // Storage slots for demonstrating handle persistence
    euint64 public handle1;
    euint64 public handle2;
    euint64 public handle3;
    
    address public owner;
    
    // Track handle creation for demonstration
    event HandleCreated(string description, uint256 handleId);
    event OperationPerformed(string operation, uint256 resultHandleId);

    constructor() {
        owner = msg.sender;
    }

    /**
     * @notice Stage 1: Create handle from encrypted input
     * @dev This is where handles are born - from user-provided encrypted data
     */
    function stage1_createFromInput(einput encValue, bytes calldata proof) external {
        // A new handle is created here
        handle1 = TFHE.asEuint64(encValue, proof);
        
        // Handle must be permissioned immediately
        TFHE.allowThis(handle1);
        TFHE.allow(handle1, owner);
        
        emit HandleCreated("Created from encrypted input", euint64.unwrap(handle1));
    }

    /**
     * @notice Stage 2: Create handle from plaintext
     * @dev Handles can also be created from plaintext values
     */
    function stage2_createFromPlaintext(uint64 plainValue) external {
        // New handle created from plaintext
        handle2 = TFHE.asEuint64(plainValue);
        
        TFHE.allowThis(handle2);
        TFHE.allow(handle2, owner);
        
        emit HandleCreated("Created from plaintext", euint64.unwrap(handle2));
    }

    /**
     * @notice Stage 3: Operations create NEW handles
     * @dev Important: The result of any FHE operation is a NEW handle
     */
    function stage3_operationCreatesNewHandle() external {
        require(TFHE.isInitialized(handle1), "Run stage1 first");
        require(TFHE.isInitialized(handle2), "Run stage2 first");
        
        // This creates a COMPLETELY NEW handle
        // handle1 and handle2 still exist separately
        handle3 = TFHE.add(handle1, handle2);
        
        // The new handle needs its own permissions
        // Permissions from handle1 and handle2 do NOT transfer
        TFHE.allowThis(handle3);
        TFHE.allow(handle3, owner);
        
        emit OperationPerformed("add(handle1, handle2)", euint64.unwrap(handle3));
    }

    /**
     * @notice Stage 4: Overwriting handles
     * @dev When you assign a new value, the old handle is orphaned
     */
    function stage4_overwriteHandle(einput newValue, bytes calldata proof) external {
        uint256 oldHandleId = euint64.unwrap(handle1);
        
        // Old handle1 is now orphaned (still exists but no longer referenced)
        handle1 = TFHE.asEuint64(newValue, proof);
        
        TFHE.allowThis(handle1);
        TFHE.allow(handle1, owner);
        
        emit HandleCreated("Overwrote handle1", euint64.unwrap(handle1));
        // Note: oldHandleId is now orphaned
    }

    /**
     * @notice Stage 5: Chained operations
     * @dev Each operation in a chain creates intermediate handles
     */
    function stage5_chainedOperations(einput a, bytes calldata proofA) external {
        euint64 inputHandle = TFHE.asEuint64(a, proofA);
        
        // Each operation creates a new handle
        euint64 temp1 = TFHE.add(inputHandle, TFHE.asEuint64(10));  // Handle created
        euint64 temp2 = TFHE.mul(temp1, TFHE.asEuint64(2));         // Another handle
        euint64 temp3 = TFHE.sub(temp2, TFHE.asEuint64(5));         // Another handle
        
        // Only permission the final result
        handle1 = temp3;
        TFHE.allowThis(handle1);
        TFHE.allow(handle1, owner);
        
        // temp1 and temp2 are intermediate handles - not stored
        emit OperationPerformed("chained: ((a + 10) * 2) - 5", euint64.unwrap(handle1));
    }

    /**
     * @notice Check if handles are initialized
     */
    function getHandleStatus() external view returns (bool h1Init, bool h2Init, bool h3Init) {
        return (
            TFHE.isInitialized(handle1),
            TFHE.isInitialized(handle2),
            TFHE.isInitialized(handle3)
        );
    }

    /**
     * @notice Get raw handle IDs for demonstration
     */
    function getHandleIds() external view returns (uint256, uint256, uint256) {
        return (
            euint64.unwrap(handle1),
            euint64.unwrap(handle2),
            euint64.unwrap(handle3)
        );
    }
}`,
    test: `import { expect } from "chai";
import { ethers } from "hardhat";
import { createInstance } from "../instance";
import { getSigners, initSigners } from "../signers";

describe("HandleLifecycle", function () {
  let contract: any;
  let fhevm: any;

  before(async function () {
    await initSigners();
    fhevm = await createInstance();
  });

  beforeEach(async function () {
    const signers = await getSigners();
    const Factory = await ethers.getContractFactory("HandleLifecycle");
    contract = await Factory.connect(signers.alice).deploy();
    await contract.waitForDeployment();
  });

  describe("Handle Lifecycle Stages", function () {
    it("Stage 1: should create handle from encrypted input", async function () {
      const signers = await getSigners();
      const contractAddress = await contract.getAddress();

      const input = fhevm.createEncryptedInput(contractAddress, signers.alice.address);
      input.add64(100);
      const encrypted = await input.encrypt();

      const tx = await contract.stage1_createFromInput(
        encrypted.handles[0],
        encrypted.inputProof
      );
      await tx.wait();

      await expect(tx).to.emit(contract, "HandleCreated");
      
      const [h1Init, , ] = await contract.getHandleStatus();
      expect(h1Init).to.equal(true);
    });

    it("Stage 2: should create handle from plaintext", async function () {
      const tx = await contract.stage2_createFromPlaintext(50);
      await tx.wait();

      await expect(tx).to.emit(contract, "HandleCreated");
      
      const [, h2Init, ] = await contract.getHandleStatus();
      expect(h2Init).to.equal(true);
    });

    it("Stage 3: should create new handle from operation", async function () {
      const signers = await getSigners();
      const contractAddress = await contract.getAddress();

      // Setup: run stages 1 and 2
      const input = fhevm.createEncryptedInput(contractAddress, signers.alice.address);
      input.add64(100);
      const encrypted = await input.encrypt();
      await (await contract.stage1_createFromInput(encrypted.handles[0], encrypted.inputProof)).wait();
      await (await contract.stage2_createFromPlaintext(50)).wait();

      // Get handle IDs before operation
      const [id1Before, id2Before, ] = await contract.getHandleIds();

      // Stage 3: operation creates new handle
      const tx = await contract.stage3_operationCreatesNewHandle();
      await tx.wait();

      await expect(tx).to.emit(contract, "OperationPerformed");

      // Verify all three handles exist and are different
      const [id1After, id2After, id3] = await contract.getHandleIds();
      expect(id1After).to.equal(id1Before); // Original unchanged
      expect(id2After).to.equal(id2Before); // Original unchanged
      expect(id3).to.not.equal(id1After);   // New handle
      expect(id3).to.not.equal(id2After);   // New handle
    });

    it("Stage 4: should overwrite handle", async function () {
      const signers = await getSigners();
      const contractAddress = await contract.getAddress();

      // Create initial handle
      const input1 = fhevm.createEncryptedInput(contractAddress, signers.alice.address);
      input1.add64(100);
      const enc1 = await input1.encrypt();
      await (await contract.stage1_createFromInput(enc1.handles[0], enc1.inputProof)).wait();

      const [oldId, , ] = await contract.getHandleIds();

      // Overwrite
      const input2 = fhevm.createEncryptedInput(contractAddress, signers.alice.address);
      input2.add64(999);
      const enc2 = await input2.encrypt();
      await (await contract.stage4_overwriteHandle(enc2.handles[0], enc2.inputProof)).wait();

      const [newId, , ] = await contract.getHandleIds();
      expect(newId).to.not.equal(oldId);
    });

    it("Stage 5: should handle chained operations", async function () {
      const signers = await getSigners();
      const contractAddress = await contract.getAddress();

      const input = fhevm.createEncryptedInput(contractAddress, signers.alice.address);
      input.add64(10);
      const encrypted = await input.encrypt();

      const tx = await contract.stage5_chainedOperations(
        encrypted.handles[0],
        encrypted.inputProof
      );
      await tx.wait();

      await expect(tx).to.emit(contract, "OperationPerformed");
      // Result: ((10 + 10) * 2) - 5 = 35
    });
  });
});`
  },
  {
    name: 'blind-auction',
    category: 'advanced',
    description: 'A blind auction where bid amounts remain encrypted until the auction ends',
    contractName: 'BlindAuction',
    contract: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "fhevm/lib/TFHE.sol";
import "fhevm/config/ZamaFHEVMConfig.sol";
import "fhevm/config/ZamaGatewayConfig.sol";
import "fhevm/gateway/GatewayCaller.sol";

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
}`,
    test: `import { expect } from "chai";
import { ethers } from "hardhat";
import { createInstance } from "../instance";
import { getSigners, initSigners } from "../signers";

describe("BlindAuction", function () {
  let contract: any;
  let fhevm: any;

  before(async function () {
    await initSigners();
    fhevm = await createInstance();
  });

  beforeEach(async function () {
    const signers = await getSigners();
    const Factory = await ethers.getContractFactory("BlindAuction");
    // 1 hour auction
    contract = await Factory.connect(signers.alice).deploy(3600);
    await contract.waitForDeployment();
  });

  describe("Blind Auction", function () {
    it("should accept encrypted bids", async function () {
      const signers = await getSigners();
      const contractAddress = await contract.getAddress();

      const input = fhevm.createEncryptedInput(contractAddress, signers.bob.address);
      input.add64(100);
      const encrypted = await input.encrypt();

      const tx = await contract.connect(signers.bob).bid(
        encrypted.handles[0],
        encrypted.inputProof
      );
      await tx.wait();

      await expect(tx).to.emit(contract, "BidPlaced");
      expect(await contract.hasBid(signers.bob.address)).to.equal(true);
    });

    it("should prevent double bidding", async function () {
      const signers = await getSigners();
      const contractAddress = await contract.getAddress();

      // First bid
      const input1 = fhevm.createEncryptedInput(contractAddress, signers.bob.address);
      input1.add64(100);
      const enc1 = await input1.encrypt();
      await (await contract.connect(signers.bob).bid(enc1.handles[0], enc1.inputProof)).wait();

      // Second bid should fail
      const input2 = fhevm.createEncryptedInput(contractAddress, signers.bob.address);
      input2.add64(200);
      const enc2 = await input2.encrypt();

      await expect(
        contract.connect(signers.bob).bid(enc2.handles[0], enc2.inputProof)
      ).to.be.revertedWith("Already placed a bid");
    });

    it("should allow multiple bidders", async function () {
      const signers = await getSigners();
      const contractAddress = await contract.getAddress();

      // Bob bids 100
      const inputBob = fhevm.createEncryptedInput(contractAddress, signers.bob.address);
      inputBob.add64(100);
      const encBob = await inputBob.encrypt();
      await (await contract.connect(signers.bob).bid(encBob.handles[0], encBob.inputProof)).wait();

      // Carol bids 150
      const inputCarol = fhevm.createEncryptedInput(contractAddress, signers.carol.address);
      inputCarol.add64(150);
      const encCarol = await inputCarol.encrypt();
      await (await contract.connect(signers.carol).bid(encCarol.handles[0], encCarol.inputProof)).wait();

      expect(await contract.hasBid(signers.bob.address)).to.equal(true);
      expect(await contract.hasBid(signers.carol.address)).to.equal(true);
    });

    it("should allow bidder to view their own bid", async function () {
      const signers = await getSigners();
      const contractAddress = await contract.getAddress();

      const input = fhevm.createEncryptedInput(contractAddress, signers.bob.address);
      input.add64(250);
      const encrypted = await input.encrypt();
      await (await contract.connect(signers.bob).bid(encrypted.handles[0], encrypted.inputProof)).wait();

      // Bob can see his bid handle
      const myBid = await contract.connect(signers.bob).getMyBid();
      expect(myBid).to.not.equal(0n);
    });

    it("should prevent viewing bid if none placed", async function () {
      const signers = await getSigners();

      await expect(
        contract.connect(signers.bob).getMyBid()
      ).to.be.revertedWith("No bid placed");
    });
  });
});`
  },
  {
    name: 'confidential-voting',
    category: 'advanced',
    description: 'A voting system where votes are encrypted and tallied privately',
    contractName: 'ConfidentialVoting',
    contract: `// SPDX-License-Identifier: MIT
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
}`,
    test: `import { expect } from "chai";
import { ethers } from "hardhat";
import { createInstance } from "../instance";
import { getSigners, initSigners } from "../signers";

describe("ConfidentialVoting", function () {
  let contract: any;
  let fhevm: any;

  before(async function () {
    await initSigners();
    fhevm = await createInstance();
  });

  beforeEach(async function () {
    const signers = await getSigners();
    const Factory = await ethers.getContractFactory("ConfidentialVoting");
    contract = await Factory.connect(signers.alice).deploy();
    await contract.waitForDeployment();
  });

  describe("Confidential Voting", function () {
    it("should create a proposal", async function () {
      const tx = await contract.createProposal("Should we adopt FHE?");
      await tx.wait();

      await expect(tx).to.emit(contract, "ProposalCreated");
      expect(await contract.proposalCount()).to.equal(1);
    });

    it("should accept encrypted votes", async function () {
      const signers = await getSigners();
      const contractAddress = await contract.getAddress();

      // Create proposal
      await (await contract.createProposal("Test Proposal")).wait();

      // Bob votes yes (1)
      const input = fhevm.createEncryptedInput(contractAddress, signers.bob.address);
      input.add64(1);
      const encrypted = await input.encrypt();

      const tx = await contract.connect(signers.bob).vote(
        0,
        encrypted.handles[0],
        encrypted.inputProof
      );
      await tx.wait();

      await expect(tx).to.emit(contract, "VoteCast");
      expect(await contract.hasVoted(0, signers.bob.address)).to.equal(true);
    });

    it("should prevent double voting", async function () {
      const signers = await getSigners();
      const contractAddress = await contract.getAddress();

      await (await contract.createProposal("Test Proposal")).wait();

      // First vote
      const input1 = fhevm.createEncryptedInput(contractAddress, signers.bob.address);
      input1.add64(1);
      const enc1 = await input1.encrypt();
      await (await contract.connect(signers.bob).vote(0, enc1.handles[0], enc1.inputProof)).wait();

      // Second vote should fail
      const input2 = fhevm.createEncryptedInput(contractAddress, signers.bob.address);
      input2.add64(0);
      const enc2 = await input2.encrypt();

      await expect(
        contract.connect(signers.bob).vote(0, enc2.handles[0], enc2.inputProof)
      ).to.be.revertedWith("Already voted");
    });

    it("should allow multiple voters", async function () {
      const signers = await getSigners();
      const contractAddress = await contract.getAddress();

      await (await contract.createProposal("Test Proposal")).wait();

      // Bob votes yes
      const inputBob = fhevm.createEncryptedInput(contractAddress, signers.bob.address);
      inputBob.add64(1);
      const encBob = await inputBob.encrypt();
      await (await contract.connect(signers.bob).vote(0, encBob.handles[0], encBob.inputProof)).wait();

      // Carol votes no
      const inputCarol = fhevm.createEncryptedInput(contractAddress, signers.carol.address);
      inputCarol.add64(0);
      const encCarol = await inputCarol.encrypt();
      await (await contract.connect(signers.carol).vote(0, encCarol.handles[0], encCarol.inputProof)).wait();

      expect(await contract.hasVoted(0, signers.bob.address)).to.equal(true);
      expect(await contract.hasVoted(0, signers.carol.address)).to.equal(true);
    });

    it("should close voting", async function () {
      const tx = await contract.closeVoting();
      await tx.wait();

      await expect(tx).to.emit(contract, "VotingClosed");
      expect(await contract.votingOpen()).to.equal(false);
    });

    it("should prevent voting after close", async function () {
      const signers = await getSigners();
      const contractAddress = await contract.getAddress();

      await (await contract.createProposal("Test")).wait();
      await (await contract.closeVoting()).wait();

      const input = fhevm.createEncryptedInput(contractAddress, signers.bob.address);
      input.add64(1);
      const encrypted = await input.encrypt();

      await expect(
        contract.connect(signers.bob).vote(0, encrypted.handles[0], encrypted.inputProof)
      ).to.be.revertedWith("Voting is closed");
    });
  });
});`
  },
  {
    name: 'encrypted-lottery',
    category: 'advanced',
    description: 'A lottery system where ticket numbers remain encrypted until the draw',
    contractName: 'EncryptedLottery',
    contract: `// SPDX-License-Identifier: MIT
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
}`,
    test: `import { expect } from "chai";
import { ethers } from "hardhat";
import { createInstance } from "../instance";
import { getSigners, initSigners } from "../signers";

describe("EncryptedLottery", function () {
  let contract: any;
  let fhevm: any;

  before(async function () {
    await initSigners();
    fhevm = await createInstance();
  });

  beforeEach(async function () {
    const signers = await getSigners();
    const Factory = await ethers.getContractFactory("EncryptedLottery");
    // 0.01 ETH ticket price, 1 hour duration
    contract = await Factory.connect(signers.alice).deploy(
      ethers.parseEther("0.01"),
      3600
    );
    await contract.waitForDeployment();
  });

  describe("Encrypted Lottery", function () {
    it("should allow ticket purchase with encrypted number", async function () {
      const signers = await getSigners();
      const contractAddress = await contract.getAddress();

      const input = fhevm.createEncryptedInput(contractAddress, signers.bob.address);
      input.add64(42);
      const encrypted = await input.encrypt();

      const tx = await contract.connect(signers.bob).buyTicket(
        encrypted.handles[0],
        encrypted.inputProof,
        { value: ethers.parseEther("0.01") }
      );
      await tx.wait();

      await expect(tx).to.emit(contract, "TicketPurchased");
      expect(await contract.hasTicket(signers.bob.address)).to.equal(true);
    });

    it("should reject insufficient payment", async function () {
      const signers = await getSigners();
      const contractAddress = await contract.getAddress();

      const input = fhevm.createEncryptedInput(contractAddress, signers.bob.address);
      input.add64(42);
      const encrypted = await input.encrypt();

      await expect(
        contract.connect(signers.bob).buyTicket(
          encrypted.handles[0],
          encrypted.inputProof,
          { value: ethers.parseEther("0.001") }
        )
      ).to.be.revertedWith("Insufficient payment");
    });

    it("should prevent double ticket purchase", async function () {
      const signers = await getSigners();
      const contractAddress = await contract.getAddress();

      // First ticket
      const input1 = fhevm.createEncryptedInput(contractAddress, signers.bob.address);
      input1.add64(42);
      const enc1 = await input1.encrypt();
      await (await contract.connect(signers.bob).buyTicket(
        enc1.handles[0],
        enc1.inputProof,
        { value: ethers.parseEther("0.01") }
      )).wait();

      // Second ticket should fail
      const input2 = fhevm.createEncryptedInput(contractAddress, signers.bob.address);
      input2.add64(77);
      const enc2 = await input2.encrypt();

      await expect(
        contract.connect(signers.bob).buyTicket(
          enc2.handles[0],
          enc2.inputProof,
          { value: ethers.parseEther("0.01") }
        )
      ).to.be.revertedWith("Already has ticket");
    });

    it("should track prize pool", async function () {
      const signers = await getSigners();
      const contractAddress = await contract.getAddress();

      const input = fhevm.createEncryptedInput(contractAddress, signers.bob.address);
      input.add64(42);
      const encrypted = await input.encrypt();

      await (await contract.connect(signers.bob).buyTicket(
        encrypted.handles[0],
        encrypted.inputProof,
        { value: ethers.parseEther("0.01") }
      )).wait();

      const prizePool = await contract.getPrizePool();
      expect(prizePool).to.equal(ethers.parseEther("0.01"));
    });

    it("should allow viewing own ticket", async function () {
      const signers = await getSigners();
      const contractAddress = await contract.getAddress();

      const input = fhevm.createEncryptedInput(contractAddress, signers.bob.address);
      input.add64(42);
      const encrypted = await input.encrypt();

      await (await contract.connect(signers.bob).buyTicket(
        encrypted.handles[0],
        encrypted.inputProof,
        { value: ethers.parseEther("0.01") }
      )).wait();

      const ticket = await contract.connect(signers.bob).getMyTicket();
      expect(ticket).to.not.equal(0n);
    });
  });
});`
  }
];

async function createExamples(): Promise<void> {
  console.log('\nCreating advanced examples...\n');

  const baseTemplatePath = path.join(__dirname, '../../base-template');
  const examplesPath = path.join(__dirname, '../../examples');

  for (const example of EXAMPLES) {
    console.log(`Creating: ${example.name}...`);
    
    const examplePath = path.join(examplesPath, example.name);

    if (await fs.pathExists(examplePath)) {
      console.log(`  [SKIP] Already exists`);
      continue;
    }

    await fs.copy(baseTemplatePath, examplePath);

    const contractsDir = path.join(examplePath, 'contracts');
    const existingContracts = await fs.readdir(contractsDir);
    for (const file of existingContracts) {
      if (file.endsWith('.sol')) {
        await fs.remove(path.join(contractsDir, file));
      }
    }

    await fs.writeFile(
      path.join(contractsDir, `${example.contractName}.sol`),
      example.contract
    );

    const testsDir = path.join(examplePath, 'test');
    const existingTests = await fs.readdir(testsDir);
    for (const file of existingTests) {
      if (file.endsWith('.ts') && !['instance.ts', 'signers.ts'].includes(file)) {
        await fs.remove(path.join(testsDir, file));
      }
    }

    await fs.writeFile(
      path.join(testsDir, `${example.contractName}.ts`),
      example.test
    );

    await fs.writeFile(
      path.join(examplePath, 'example.json'),
      JSON.stringify({
        name: example.name,
        category: example.category,
        description: example.description,
        createdAt: new Date().toISOString()
      }, null, 2)
    );

    await fs.writeFile(
      path.join(examplePath, 'README.md'),
      `# ${example.name.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}\n\n> Category: ${example.category}\n\n${example.description}\n\n## Quick Start\n\n\`\`\`bash\nnpm install\nnpm run compile\nnpm run test\n\`\`\`\n`
    );

    console.log(`  [OK] Created successfully`);
  }

  console.log('\n[DONE] Advanced examples created!\n');
}

createExamples().catch(console.error);