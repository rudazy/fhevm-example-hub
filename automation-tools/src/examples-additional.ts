import * as fs from 'fs-extra';
import * as path from 'path';

const EXAMPLES = [
  {
    name: 'erc7984-to-erc20-wrapper',
    category: 'advanced',
    description: 'Wrapper contract that converts between ERC7984 confidential tokens and standard ERC20 tokens',
    contractName: 'ConfidentialToERC20Wrapper',
    contract: `// SPDX-License-Identifier: MIT
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
}`,
    test: `import { expect } from "chai";
import { ethers } from "hardhat";
import { createInstance } from "../instance";
import { getSigners, initSigners } from "../signers";

describe("ConfidentialToERC20Wrapper", function () {
  let contract: any;
  let fhevm: any;

  before(async function () {
    await initSigners();
    fhevm = await createInstance();
  });

  beforeEach(async function () {
    const signers = await getSigners();
    const Factory = await ethers.getContractFactory("ConfidentialToERC20Wrapper");
    contract = await Factory.connect(signers.alice).deploy();
    await contract.waitForDeployment();
  });

  describe("Wrap and Unwrap", function () {
    it("should mint public tokens", async function () {
      const signers = await getSigners();
      
      await contract.mintPublic(signers.alice.address, 1000);
      
      expect(await contract.balanceOf(signers.alice.address)).to.equal(1000);
    });

    it("should wrap public tokens to encrypted", async function () {
      const signers = await getSigners();
      
      // Mint public tokens first
      await contract.mintPublic(signers.alice.address, 1000);
      
      // Wrap them
      const tx = await contract.wrap(500);
      await tx.wait();
      
      await expect(tx).to.emit(contract, "Wrap");
      expect(await contract.balanceOf(signers.alice.address)).to.equal(500);
    });

    it("should fail wrap with insufficient balance", async function () {
      await expect(contract.wrap(100)).to.be.revertedWith("Insufficient public balance");
    });

    it("should request unwrap", async function () {
      const signers = await getSigners();
      const contractAddress = await contract.getAddress();
      
      // Mint and wrap first
      await contract.mintPublic(signers.alice.address, 1000);
      await contract.wrap(500);
      
      // Request unwrap
      const input = fhevm.createEncryptedInput(contractAddress, signers.alice.address);
      input.add64(200);
      const encrypted = await input.encrypt();
      
      const tx = await contract.requestUnwrap(encrypted.handles[0], encrypted.inputProof);
      await tx.wait();
      
      await expect(tx).to.emit(contract, "UnwrapRequested");
    });

    it("should transfer public tokens", async function () {
      const signers = await getSigners();
      
      await contract.mintPublic(signers.alice.address, 1000);
      
      const tx = await contract.transfer(signers.bob.address, 300);
      await tx.wait();
      
      expect(await contract.balanceOf(signers.alice.address)).to.equal(700);
      expect(await contract.balanceOf(signers.bob.address)).to.equal(300);
    });
  });
});`
  },
  {
    name: 'confidential-nft',
    category: 'advanced',
    description: 'NFT with encrypted metadata that only the owner can reveal',
    contractName: 'ConfidentialNFT',
    contract: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "fhevm/lib/TFHE.sol";
import "fhevm/config/ZamaFHEVMConfig.sol";
import "fhevm/config/ZamaGatewayConfig.sol";
import "fhevm/gateway/GatewayCaller.sol";

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
contract ConfidentialNFT is SepoliaZamaFHEVMConfig, SepoliaZamaGatewayConfig, GatewayCaller {
    
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
        TFHE.allowThis(rarity);
        TFHE.allowThis(power);
        TFHE.allowThis(secretCode);
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
}`,
    test: `import { expect } from "chai";
import { ethers } from "hardhat";
import { createInstance } from "../instance";
import { getSigners, initSigners } from "../signers";

describe("ConfidentialNFT", function () {
  let contract: any;
  let fhevm: any;

  before(async function () {
    await initSigners();
    fhevm = await createInstance();
  });

  beforeEach(async function () {
    const signers = await getSigners();
    const Factory = await ethers.getContractFactory("ConfidentialNFT");
    contract = await Factory.connect(signers.alice).deploy();
    await contract.waitForDeployment();
  });

  describe("Confidential NFT", function () {
    it("should mint NFT with encrypted attributes", async function () {
      const signers = await getSigners();
      const contractAddress = await contract.getAddress();

      const inputRarity = fhevm.createEncryptedInput(contractAddress, signers.alice.address);
      inputRarity.add64(85);
      const encRarity = await inputRarity.encrypt();

      const inputPower = fhevm.createEncryptedInput(contractAddress, signers.alice.address);
      inputPower.add64(150);
      const encPower = await inputPower.encrypt();

      const inputSecret = fhevm.createEncryptedInput(contractAddress, signers.alice.address);
      inputSecret.add64(123456);
      const encSecret = await inputSecret.encrypt();

      const tx = await contract.mint(
        signers.bob.address,
        encRarity.handles[0], encRarity.inputProof,
        encPower.handles[0], encPower.inputProof,
        encSecret.handles[0], encSecret.inputProof
      );
      await tx.wait();

      await expect(tx).to.emit(contract, "Mint");
      expect(await contract.ownerOf(0)).to.equal(signers.bob.address);
      expect(await contract.balanceOf(signers.bob.address)).to.equal(1);
    });

    it("should transfer NFT", async function () {
      const signers = await getSigners();
      const contractAddress = await contract.getAddress();

      // Mint first
      const inputRarity = fhevm.createEncryptedInput(contractAddress, signers.alice.address);
      inputRarity.add64(50);
      const encRarity = await inputRarity.encrypt();

      const inputPower = fhevm.createEncryptedInput(contractAddress, signers.alice.address);
      inputPower.add64(100);
      const encPower = await inputPower.encrypt();

      const inputSecret = fhevm.createEncryptedInput(contractAddress, signers.alice.address);
      inputSecret.add64(999);
      const encSecret = await inputSecret.encrypt();

      await contract.mint(
        signers.alice.address,
        encRarity.handles[0], encRarity.inputProof,
        encPower.handles[0], encPower.inputProof,
        encSecret.handles[0], encSecret.inputProof
      );

      // Transfer
      const tx = await contract.transfer(signers.bob.address, 0);
      await tx.wait();

      await expect(tx).to.emit(contract, "Transfer");
      expect(await contract.ownerOf(0)).to.equal(signers.bob.address);
    });

    it("should prevent non-owner from viewing attributes", async function () {
      const signers = await getSigners();
      const contractAddress = await contract.getAddress();

      // Mint to Bob
      const inputRarity = fhevm.createEncryptedInput(contractAddress, signers.alice.address);
      inputRarity.add64(75);
      const encRarity = await inputRarity.encrypt();

      const inputPower = fhevm.createEncryptedInput(contractAddress, signers.alice.address);
      inputPower.add64(200);
      const encPower = await inputPower.encrypt();

      const inputSecret = fhevm.createEncryptedInput(contractAddress, signers.alice.address);
      inputSecret.add64(555);
      const encSecret = await inputSecret.encrypt();

      await contract.mint(
        signers.bob.address,
        encRarity.handles[0], encRarity.inputProof,
        encPower.handles[0], encPower.inputProof,
        encSecret.handles[0], encSecret.inputProof
      );

      // Alice (not owner) tries to view
      await expect(contract.getRarity(0)).to.be.revertedWith("Not owner");
    });

    it("should allow owner to view encrypted attributes", async function () {
      const signers = await getSigners();
      const contractAddress = await contract.getAddress();

      // Mint to Alice
      const inputRarity = fhevm.createEncryptedInput(contractAddress, signers.alice.address);
      inputRarity.add64(90);
      const encRarity = await inputRarity.encrypt();

      const inputPower = fhevm.createEncryptedInput(contractAddress, signers.alice.address);
      inputPower.add64(300);
      const encPower = await inputPower.encrypt();

      const inputSecret = fhevm.createEncryptedInput(contractAddress, signers.alice.address);
      inputSecret.add64(777);
      const encSecret = await inputSecret.encrypt();

      await contract.mint(
        signers.alice.address,
        encRarity.handles[0], encRarity.inputProof,
        encPower.handles[0], encPower.inputProof,
        encSecret.handles[0], encSecret.inputProof
      );

      // Alice can view
      const rarity = await contract.getRarity(0);
      expect(rarity).to.not.equal(0n);
    });
  });
});`
  },
  {
    name: 'private-escrow',
    category: 'advanced',
    description: 'Escrow contract with encrypted amounts and conditions',
    contractName: 'PrivateEscrow',
    contract: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "fhevm/lib/TFHE.sol";
import "fhevm/config/ZamaFHEVMConfig.sol";
import "fhevm/config/ZamaGatewayConfig.sol";
import "fhevm/gateway/GatewayCaller.sol";

/**
 * @title PrivateEscrow
 * @author FHEVM Example Hub
 * @notice Escrow with encrypted amounts
 * @dev This example shows:
 *      - Encrypted escrow deposits
 *      - Condition-based release
 *      - Private dispute resolution
 * 
 * @custom:category advanced
 * @custom:difficulty advanced
 */
contract PrivateEscrow is SepoliaZamaFHEVMConfig, SepoliaZamaGatewayConfig, GatewayCaller {
    
    enum EscrowState { Created, Funded, Released, Refunded, Disputed }
    
    struct Escrow {
        address buyer;
        address seller;
        address arbiter;
        euint64 amount;
        EscrowState state;
        uint256 createdAt;
    }
    
    mapping(uint256 => Escrow) public escrows;
    uint256 public escrowCount;
    
    // For release tracking
    mapping(uint256 => address) private releaseRequests;
    
    event EscrowCreated(uint256 indexed escrowId, address buyer, address seller);
    event EscrowFunded(uint256 indexed escrowId);
    event EscrowReleased(uint256 indexed escrowId);
    event EscrowRefunded(uint256 indexed escrowId);
    event DisputeRaised(uint256 indexed escrowId);

    /**
     * @notice Create a new escrow
     * @param seller Address of the seller
     * @param arbiter Address of the arbiter for disputes
     */
    function createEscrow(address seller, address arbiter) external returns (uint256) {
        require(seller != address(0), "Invalid seller");
        require(arbiter != address(0), "Invalid arbiter");
        require(seller != msg.sender, "Seller cannot be buyer");
        
        uint256 escrowId = escrowCount++;
        
        escrows[escrowId] = Escrow({
            buyer: msg.sender,
            seller: seller,
            arbiter: arbiter,
            amount: TFHE.asEuint64(0),
            state: EscrowState.Created,
            createdAt: block.timestamp
        });
        
        emit EscrowCreated(escrowId, msg.sender, seller);
        return escrowId;
    }

    /**
     * @notice Fund the escrow with encrypted amount
     */
    function fundEscrow(
        uint256 escrowId,
        einput encAmount,
        bytes calldata proof
    ) external {
        Escrow storage escrow = escrows[escrowId];
        require(escrow.buyer == msg.sender, "Only buyer");
        require(escrow.state == EscrowState.Created, "Invalid state");
        
        escrow.amount = TFHE.asEuint64(encAmount, proof);
        escrow.state = EscrowState.Funded;
        
        TFHE.allowThis(escrow.amount);
        TFHE.allow(escrow.amount, escrow.buyer);
        TFHE.allow(escrow.amount, escrow.seller);
        TFHE.allow(escrow.amount, escrow.arbiter);
        
        emit EscrowFunded(escrowId);
    }

    /**
     * @notice Buyer releases funds to seller
     */
    function release(uint256 escrowId) external {
        Escrow storage escrow = escrows[escrowId];
        require(escrow.buyer == msg.sender, "Only buyer");
        require(escrow.state == EscrowState.Funded, "Invalid state");
        
        escrow.state = EscrowState.Released;
        emit EscrowReleased(escrowId);
    }

    /**
     * @notice Seller requests refund (requires buyer or arbiter approval)
     */
    function refund(uint256 escrowId) external {
        Escrow storage escrow = escrows[escrowId];
        require(
            escrow.buyer == msg.sender || escrow.arbiter == msg.sender,
            "Only buyer or arbiter"
        );
        require(escrow.state == EscrowState.Funded || escrow.state == EscrowState.Disputed, "Invalid state");
        
        escrow.state = EscrowState.Refunded;
        emit EscrowRefunded(escrowId);
    }

    /**
     * @notice Raise a dispute
     */
    function raiseDispute(uint256 escrowId) external {
        Escrow storage escrow = escrows[escrowId];
        require(
            escrow.buyer == msg.sender || escrow.seller == msg.sender,
            "Only buyer or seller"
        );
        require(escrow.state == EscrowState.Funded, "Invalid state");
        
        escrow.state = EscrowState.Disputed;
        emit DisputeRaised(escrowId);
    }

    /**
     * @notice Arbiter resolves dispute
     * @param releaseToSeller True to release to seller, false to refund buyer
     */
    function resolveDispute(uint256 escrowId, bool releaseToSeller) external {
        Escrow storage escrow = escrows[escrowId];
        require(escrow.arbiter == msg.sender, "Only arbiter");
        require(escrow.state == EscrowState.Disputed, "Not disputed");
        
        if (releaseToSeller) {
            escrow.state = EscrowState.Released;
            emit EscrowReleased(escrowId);
        } else {
            escrow.state = EscrowState.Refunded;
            emit EscrowRefunded(escrowId);
        }
    }

    /**
     * @notice Get escrow amount (only parties can view)
     */
    function getAmount(uint256 escrowId) external view returns (euint64) {
        Escrow storage escrow = escrows[escrowId];
        require(
            msg.sender == escrow.buyer ||
            msg.sender == escrow.seller ||
            msg.sender == escrow.arbiter,
            "Not authorized"
        );
        return escrow.amount;
    }

    /**
     * @notice Get escrow details
     */
    function getEscrow(uint256 escrowId) external view returns (
        address buyer,
        address seller,
        address arbiter,
        EscrowState state,
        uint256 createdAt
    ) {
        Escrow storage escrow = escrows[escrowId];
        return (escrow.buyer, escrow.seller, escrow.arbiter, escrow.state, escrow.createdAt);
    }
}`,
    test: `import { expect } from "chai";
import { ethers } from "hardhat";
import { createInstance } from "../instance";
import { getSigners, initSigners } from "../signers";

describe("PrivateEscrow", function () {
  let contract: any;
  let fhevm: any;

  before(async function () {
    await initSigners();
    fhevm = await createInstance();
  });

  beforeEach(async function () {
    const signers = await getSigners();
    const Factory = await ethers.getContractFactory("PrivateEscrow");
    contract = await Factory.connect(signers.alice).deploy();
    await contract.waitForDeployment();
  });

  describe("Private Escrow", function () {
    it("should create escrow", async function () {
      const signers = await getSigners();
      
      const tx = await contract.createEscrow(signers.bob.address, signers.carol.address);
      await tx.wait();

      await expect(tx).to.emit(contract, "EscrowCreated");
      
      const [buyer, seller, arbiter, state] = await contract.getEscrow(0);
      expect(buyer).to.equal(signers.alice.address);
      expect(seller).to.equal(signers.bob.address);
      expect(arbiter).to.equal(signers.carol.address);
      expect(state).to.equal(0); // Created
    });

    it("should fund escrow with encrypted amount", async function () {
      const signers = await getSigners();
      const contractAddress = await contract.getAddress();
      
      await contract.createEscrow(signers.bob.address, signers.carol.address);
      
      const input = fhevm.createEncryptedInput(contractAddress, signers.alice.address);
      input.add64(1000);
      const encrypted = await input.encrypt();
      
      const tx = await contract.fundEscrow(0, encrypted.handles[0], encrypted.inputProof);
      await tx.wait();

      await expect(tx).to.emit(contract, "EscrowFunded");
      
      const [,,,state] = await contract.getEscrow(0);
      expect(state).to.equal(1); // Funded
    });

    it("should release escrow", async function () {
      const signers = await getSigners();
      const contractAddress = await contract.getAddress();
      
      await contract.createEscrow(signers.bob.address, signers.carol.address);
      
      const input = fhevm.createEncryptedInput(contractAddress, signers.alice.address);
      input.add64(500);
      const encrypted = await input.encrypt();
      await contract.fundEscrow(0, encrypted.handles[0], encrypted.inputProof);
      
      const tx = await contract.release(0);
      await tx.wait();

      await expect(tx).to.emit(contract, "EscrowReleased");
      
      const [,,,state] = await contract.getEscrow(0);
      expect(state).to.equal(2); // Released
    });

    it("should raise dispute", async function () {
      const signers = await getSigners();
      const contractAddress = await contract.getAddress();
      
      await contract.createEscrow(signers.bob.address, signers.carol.address);
      
      const input = fhevm.createEncryptedInput(contractAddress, signers.alice.address);
      input.add64(750);
      const encrypted = await input.encrypt();
      await contract.fundEscrow(0, encrypted.handles[0], encrypted.inputProof);
      
      const tx = await contract.raiseDispute(0);
      await tx.wait();

      await expect(tx).to.emit(contract, "DisputeRaised");
      
      const [,,,state] = await contract.getEscrow(0);
      expect(state).to.equal(4); // Disputed
    });

    it("should allow arbiter to resolve dispute", async function () {
      const signers = await getSigners();
      const contractAddress = await contract.getAddress();
      
      await contract.createEscrow(signers.bob.address, signers.carol.address);
      
      const input = fhevm.createEncryptedInput(contractAddress, signers.alice.address);
      input.add64(250);
      const encrypted = await input.encrypt();
      await contract.fundEscrow(0, encrypted.handles[0], encrypted.inputProof);
      await contract.raiseDispute(0);
      
      // Carol (arbiter) resolves
      const tx = await contract.connect(signers.carol).resolveDispute(0, true);
      await tx.wait();

      await expect(tx).to.emit(contract, "EscrowReleased");
    });

    it("should prevent unauthorized amount viewing", async function () {
      const signers = await getSigners();
      const contractAddress = await contract.getAddress();
      
      await contract.createEscrow(signers.bob.address, signers.carol.address);
      
      const input = fhevm.createEncryptedInput(contractAddress, signers.alice.address);
      input.add64(100);
      const encrypted = await input.encrypt();
      await contract.fundEscrow(0, encrypted.handles[0], encrypted.inputProof);
      
      // Dave (not a party) tries to view
      await expect(
        contract.connect(signers.dave).getAmount(0)
      ).to.be.revertedWith("Not authorized");
    });
  });
});`
  }
];

async function createExamples(): Promise<void> {
  console.log('\nCreating additional examples...\n');

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

  console.log('\n[DONE] Additional examples created!\n');
}

createExamples().catch(console.error);