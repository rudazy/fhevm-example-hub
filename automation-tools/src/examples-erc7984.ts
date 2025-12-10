import * as fs from 'fs-extra';
import * as path from 'path';

const EXAMPLES = [
  {
    name: 'erc7984-confidential-token',
    category: 'advanced',
    description: 'ERC7984 confidential token implementation with encrypted balances',
    contractName: 'ConfidentialToken',
    contract: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "fhevm/lib/TFHE.sol";
import "fhevm/config/ZamaFHEVMConfig.sol";

/**
 * @title ConfidentialToken
 * @author FHEVM Example Hub
 * @notice ERC7984-style confidential token with encrypted balances
 * @dev This example shows:
 *      - Encrypted token balances
 *      - Confidential transfers
 *      - Private allowance management
 * 
 * @custom:category advanced
 * @custom:difficulty advanced
 */
contract ConfidentialToken is SepoliaZamaFHEVMConfig {
    
    string public name;
    string public symbol;
    uint8 public decimals;
    
    // Encrypted balances
    mapping(address => euint64) private _balances;
    
    // Encrypted allowances
    mapping(address => mapping(address => euint64)) private _allowances;
    
    // Total supply (public for simplicity, could be encrypted)
    uint256 public totalSupply;
    
    address public owner;
    
    event Transfer(address indexed from, address indexed to);
    event Approval(address indexed owner, address indexed spender);
    event Mint(address indexed to, uint256 amount);

    constructor(string memory _name, string memory _symbol) {
        name = _name;
        symbol = _symbol;
        decimals = 18;
        owner = msg.sender;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    /**
     * @notice Mint new tokens to an address
     * @param to Recipient address
     * @param amount Amount to mint (plaintext, will be encrypted)
     */
    function mint(address to, uint64 amount) external onlyOwner {
        euint64 encAmount = TFHE.asEuint64(amount);
        
        if (TFHE.isInitialized(_balances[to])) {
            _balances[to] = TFHE.add(_balances[to], encAmount);
        } else {
            _balances[to] = encAmount;
        }
        
        TFHE.allowThis(_balances[to]);
        TFHE.allow(_balances[to], to);
        
        totalSupply += amount;
        emit Mint(to, amount);
    }

    /**
     * @notice Transfer tokens confidentially
     * @param to Recipient address
     * @param encryptedAmount Encrypted transfer amount
     * @param inputProof Proof for the encrypted input
     */
    function transfer(
        address to,
        einput encryptedAmount,
        bytes calldata inputProof
    ) external returns (bool) {
        require(to != address(0), "Transfer to zero address");
        require(to != msg.sender, "Transfer to self");
        
        euint64 amount = TFHE.asEuint64(encryptedAmount, inputProof);
        
        // Subtract from sender
        _balances[msg.sender] = TFHE.sub(_balances[msg.sender], amount);
        
        // Add to recipient
        if (TFHE.isInitialized(_balances[to])) {
            _balances[to] = TFHE.add(_balances[to], amount);
        } else {
            _balances[to] = amount;
        }
        
        // Update permissions
        TFHE.allowThis(_balances[msg.sender]);
        TFHE.allow(_balances[msg.sender], msg.sender);
        TFHE.allowThis(_balances[to]);
        TFHE.allow(_balances[to], to);
        
        emit Transfer(msg.sender, to);
        return true;
    }

    /**
     * @notice Approve spender to use tokens
     * @param spender Address to approve
     * @param encryptedAmount Encrypted allowance amount
     * @param inputProof Proof for the encrypted input
     */
    function approve(
        address spender,
        einput encryptedAmount,
        bytes calldata inputProof
    ) external returns (bool) {
        require(spender != address(0), "Approve zero address");
        
        euint64 amount = TFHE.asEuint64(encryptedAmount, inputProof);
        _allowances[msg.sender][spender] = amount;
        
        TFHE.allowThis(amount);
        TFHE.allow(amount, msg.sender);
        TFHE.allow(amount, spender);
        
        emit Approval(msg.sender, spender);
        return true;
    }

    /**
     * @notice Transfer tokens from another address (using allowance)
     * @param from Source address
     * @param to Destination address
     * @param encryptedAmount Encrypted transfer amount
     * @param inputProof Proof for the encrypted input
     */
    function transferFrom(
        address from,
        address to,
        einput encryptedAmount,
        bytes calldata inputProof
    ) external returns (bool) {
        require(to != address(0), "Transfer to zero address");
        
        euint64 amount = TFHE.asEuint64(encryptedAmount, inputProof);
        
        // Reduce allowance
        _allowances[from][msg.sender] = TFHE.sub(_allowances[from][msg.sender], amount);
        
        // Subtract from sender
        _balances[from] = TFHE.sub(_balances[from], amount);
        
        // Add to recipient
        if (TFHE.isInitialized(_balances[to])) {
            _balances[to] = TFHE.add(_balances[to], amount);
        } else {
            _balances[to] = amount;
        }
        
        // Update permissions
        TFHE.allowThis(_balances[from]);
        TFHE.allow(_balances[from], from);
        TFHE.allowThis(_balances[to]);
        TFHE.allow(_balances[to], to);
        TFHE.allowThis(_allowances[from][msg.sender]);
        TFHE.allow(_allowances[from][msg.sender], from);
        TFHE.allow(_allowances[from][msg.sender], msg.sender);
        
        emit Transfer(from, to);
        return true;
    }

    /**
     * @notice Get your encrypted balance
     */
    function balanceOf() external view returns (euint64) {
        return _balances[msg.sender];
    }

    /**
     * @notice Get encrypted allowance
     */
    function allowance(address spender) external view returns (euint64) {
        return _allowances[msg.sender][spender];
    }

    /**
     * @notice Check if address has balance
     */
    function hasBalance(address account) external view returns (bool) {
        return TFHE.isInitialized(_balances[account]);
    }
}`,
    test: `import { expect } from "chai";
import { ethers } from "hardhat";
import { createInstance } from "../instance";
import { getSigners, initSigners } from "../signers";

describe("ConfidentialToken", function () {
  let contract: any;
  let fhevm: any;

  before(async function () {
    await initSigners();
    fhevm = await createInstance();
  });

  beforeEach(async function () {
    const signers = await getSigners();
    const Factory = await ethers.getContractFactory("ConfidentialToken");
    contract = await Factory.connect(signers.alice).deploy("Confidential Token", "CTKN");
    await contract.waitForDeployment();
  });

  describe("ERC7984 Confidential Token", function () {
    it("should have correct name and symbol", async function () {
      expect(await contract.name()).to.equal("Confidential Token");
      expect(await contract.symbol()).to.equal("CTKN");
    });

    it("should mint tokens", async function () {
      const signers = await getSigners();
      
      const tx = await contract.mint(signers.alice.address, 1000);
      await tx.wait();

      await expect(tx).to.emit(contract, "Mint");
      expect(await contract.totalSupply()).to.equal(1000);
      expect(await contract.hasBalance(signers.alice.address)).to.equal(true);
    });

    it("should transfer tokens confidentially", async function () {
      const signers = await getSigners();
      const contractAddress = await contract.getAddress();

      // Mint to Alice
      await (await contract.mint(signers.alice.address, 1000)).wait();

      // Alice transfers to Bob
      const input = fhevm.createEncryptedInput(contractAddress, signers.alice.address);
      input.add64(300);
      const encrypted = await input.encrypt();

      const tx = await contract.transfer(
        signers.bob.address,
        encrypted.handles[0],
        encrypted.inputProof
      );
      await tx.wait();

      await expect(tx).to.emit(contract, "Transfer");
      expect(await contract.hasBalance(signers.bob.address)).to.equal(true);
    });

    it("should approve and transferFrom", async function () {
      const signers = await getSigners();
      const contractAddress = await contract.getAddress();

      // Mint to Alice
      await (await contract.mint(signers.alice.address, 1000)).wait();

      // Alice approves Bob
      const approveInput = fhevm.createEncryptedInput(contractAddress, signers.alice.address);
      approveInput.add64(500);
      const approveEnc = await approveInput.encrypt();

      await (await contract.approve(
        signers.bob.address,
        approveEnc.handles[0],
        approveEnc.inputProof
      )).wait();

      // Bob transfers from Alice to Carol
      const transferInput = fhevm.createEncryptedInput(contractAddress, signers.bob.address);
      transferInput.add64(200);
      const transferEnc = await transferInput.encrypt();

      const tx = await contract.connect(signers.bob).transferFrom(
        signers.alice.address,
        signers.carol.address,
        transferEnc.handles[0],
        transferEnc.inputProof
      );
      await tx.wait();

      await expect(tx).to.emit(contract, "Transfer");
    });

    it("should prevent transfer to zero address", async function () {
      const signers = await getSigners();
      const contractAddress = await contract.getAddress();

      await (await contract.mint(signers.alice.address, 1000)).wait();

      const input = fhevm.createEncryptedInput(contractAddress, signers.alice.address);
      input.add64(100);
      const encrypted = await input.encrypt();

      await expect(
        contract.transfer(ethers.ZeroAddress, encrypted.handles[0], encrypted.inputProof)
      ).to.be.revertedWith("Transfer to zero address");
    });
  });
});`
  },
  {
    name: 'confidential-vesting',
    category: 'advanced',
    description: 'Vesting wallet with encrypted vesting amounts and schedules',
    contractName: 'ConfidentialVesting',
    contract: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "fhevm/lib/TFHE.sol";
import "fhevm/config/ZamaFHEVMConfig.sol";
import "fhevm/config/ZamaGatewayConfig.sol";
import "fhevm/gateway/GatewayCaller.sol";

/**
 * @title ConfidentialVesting
 * @author FHEVM Example Hub
 * @notice Vesting wallet with encrypted amounts
 * @dev This example shows:
 *      - Encrypted vesting schedules
 *      - Time-based release with encrypted amounts
 *      - Private beneficiary balances
 * 
 * @custom:category advanced
 * @custom:difficulty advanced
 */
contract ConfidentialVesting is SepoliaZamaFHEVMConfig, SepoliaZamaGatewayConfig, GatewayCaller {
    
    struct VestingSchedule {
        euint64 totalAmount;
        euint64 releasedAmount;
        uint256 startTime;
        uint256 duration;
        bool exists;
    }
    
    address public owner;
    mapping(address => VestingSchedule) private vestingSchedules;
    
    event VestingCreated(address indexed beneficiary, uint256 startTime, uint256 duration);
    event TokensReleased(address indexed beneficiary);
    event ReleaseRequested(address indexed beneficiary, uint256 requestId);

    constructor() {
        owner = msg.sender;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    /**
     * @notice Create a vesting schedule for a beneficiary
     * @param beneficiary Address to receive vested tokens
     * @param encryptedAmount Encrypted total vesting amount
     * @param inputProof Proof for encrypted input
     * @param duration Vesting duration in seconds
     */
    function createVesting(
        address beneficiary,
        einput encryptedAmount,
        bytes calldata inputProof,
        uint256 duration
    ) external onlyOwner {
        require(!vestingSchedules[beneficiary].exists, "Vesting already exists");
        require(beneficiary != address(0), "Invalid beneficiary");
        require(duration > 0, "Invalid duration");
        
        euint64 amount = TFHE.asEuint64(encryptedAmount, inputProof);
        
        vestingSchedules[beneficiary] = VestingSchedule({
            totalAmount: amount,
            releasedAmount: TFHE.asEuint64(0),
            startTime: block.timestamp,
            duration: duration,
            exists: true
        });
        
        TFHE.allowThis(amount);
        TFHE.allow(amount, beneficiary);
        TFHE.allowThis(vestingSchedules[beneficiary].releasedAmount);
        TFHE.allow(vestingSchedules[beneficiary].releasedAmount, beneficiary);
        
        emit VestingCreated(beneficiary, block.timestamp, duration);
    }

    /**
     * @notice Calculate vested amount based on time
     * @param beneficiary Address to check
     * @return Encrypted vested amount
     */
    function vestedAmount(address beneficiary) public view returns (euint64) {
        VestingSchedule storage schedule = vestingSchedules[beneficiary];
        require(schedule.exists, "No vesting schedule");
        
        if (block.timestamp >= schedule.startTime + schedule.duration) {
            // Fully vested
            return schedule.totalAmount;
        }
        
        // Partial vesting - simplified calculation
        // In production, you'd use more precise math
        uint256 elapsed = block.timestamp - schedule.startTime;
        uint256 vestingPercent = (elapsed * 100) / schedule.duration;
        
        // This is a simplified approach - multiply by percent then divide
        euint64 percent = TFHE.asEuint64(uint64(vestingPercent));
        euint64 vested = TFHE.div(TFHE.mul(schedule.totalAmount, percent), TFHE.asEuint64(100));
        
        return vested;
    }

    /**
     * @notice Release vested tokens to beneficiary
     */
    function release() external {
        VestingSchedule storage schedule = vestingSchedules[msg.sender];
        require(schedule.exists, "No vesting schedule");
        
        euint64 vested = vestedAmount(msg.sender);
        euint64 releasable = TFHE.sub(vested, schedule.releasedAmount);
        
        schedule.releasedAmount = vested;
        
        TFHE.allowThis(schedule.releasedAmount);
        TFHE.allow(schedule.releasedAmount, msg.sender);
        TFHE.allowThis(releasable);
        TFHE.allow(releasable, msg.sender);
        
        emit TokensReleased(msg.sender);
    }

    /**
     * @notice Get vesting info for caller
     */
    function getMyVesting() external view returns (
        uint256 startTime,
        uint256 duration,
        bool exists
    ) {
        VestingSchedule storage schedule = vestingSchedules[msg.sender];
        return (schedule.startTime, schedule.duration, schedule.exists);
    }

    /**
     * @notice Get encrypted total amount for caller
     */
    function getMyTotalAmount() external view returns (euint64) {
        require(vestingSchedules[msg.sender].exists, "No vesting");
        return vestingSchedules[msg.sender].totalAmount;
    }

    /**
     * @notice Get encrypted released amount for caller
     */
    function getMyReleasedAmount() external view returns (euint64) {
        require(vestingSchedules[msg.sender].exists, "No vesting");
        return vestingSchedules[msg.sender].releasedAmount;
    }

    /**
     * @notice Check if vesting is fully vested
     */
    function isFullyVested(address beneficiary) external view returns (bool) {
        VestingSchedule storage schedule = vestingSchedules[beneficiary];
        if (!schedule.exists) return false;
        return block.timestamp >= schedule.startTime + schedule.duration;
    }
}`,
    test: `import { expect } from "chai";
import { ethers } from "hardhat";
import { createInstance } from "../instance";
import { getSigners, initSigners } from "../signers";

describe("ConfidentialVesting", function () {
  let contract: any;
  let fhevm: any;

  before(async function () {
    await initSigners();
    fhevm = await createInstance();
  });

  beforeEach(async function () {
    const signers = await getSigners();
    const Factory = await ethers.getContractFactory("ConfidentialVesting");
    contract = await Factory.connect(signers.alice).deploy();
    await contract.waitForDeployment();
  });

  describe("Confidential Vesting", function () {
    it("should create vesting schedule", async function () {
      const signers = await getSigners();
      const contractAddress = await contract.getAddress();

      const input = fhevm.createEncryptedInput(contractAddress, signers.alice.address);
      input.add64(10000);
      const encrypted = await input.encrypt();

      // 1 year vesting
      const tx = await contract.createVesting(
        signers.bob.address,
        encrypted.handles[0],
        encrypted.inputProof,
        365 * 24 * 60 * 60
      );
      await tx.wait();

      await expect(tx).to.emit(contract, "VestingCreated");

      const [startTime, duration, exists] = await contract.connect(signers.bob).getMyVesting();
      expect(exists).to.equal(true);
      expect(duration).to.equal(365 * 24 * 60 * 60);
    });

    it("should prevent duplicate vesting", async function () {
      const signers = await getSigners();
      const contractAddress = await contract.getAddress();

      const input1 = fhevm.createEncryptedInput(contractAddress, signers.alice.address);
      input1.add64(10000);
      const enc1 = await input1.encrypt();

      await (await contract.createVesting(
        signers.bob.address,
        enc1.handles[0],
        enc1.inputProof,
        3600
      )).wait();

      const input2 = fhevm.createEncryptedInput(contractAddress, signers.alice.address);
      input2.add64(5000);
      const enc2 = await input2.encrypt();

      await expect(
        contract.createVesting(signers.bob.address, enc2.handles[0], enc2.inputProof, 3600)
      ).to.be.revertedWith("Vesting already exists");
    });

    it("should allow beneficiary to view their vesting", async function () {
      const signers = await getSigners();
      const contractAddress = await contract.getAddress();

      const input = fhevm.createEncryptedInput(contractAddress, signers.alice.address);
      input.add64(50000);
      const encrypted = await input.encrypt();

      await (await contract.createVesting(
        signers.bob.address,
        encrypted.handles[0],
        encrypted.inputProof,
        7200
      )).wait();

      const totalAmount = await contract.connect(signers.bob).getMyTotalAmount();
      expect(totalAmount).to.not.equal(0n);
    });

    it("should release vested tokens", async function () {
      const signers = await getSigners();
      const contractAddress = await contract.getAddress();

      const input = fhevm.createEncryptedInput(contractAddress, signers.alice.address);
      input.add64(10000);
      const encrypted = await input.encrypt();

      // Short vesting for testing
      await (await contract.createVesting(
        signers.bob.address,
        encrypted.handles[0],
        encrypted.inputProof,
        60
      )).wait();

      // Release tokens
      const tx = await contract.connect(signers.bob).release();
      await tx.wait();

      await expect(tx).to.emit(contract, "TokensReleased");
    });

    it("should fail release without vesting", async function () {
      const signers = await getSigners();

      await expect(
        contract.connect(signers.bob).release()
      ).to.be.revertedWith("No vesting schedule");
    });
  });
});`
  }
];

async function createExamples(): Promise<void> {
  console.log('\nCreating ERC7984 and vesting examples...\n');

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

  console.log('\n[DONE] ERC7984 and vesting examples created!\n');
}

createExamples().catch(console.error);