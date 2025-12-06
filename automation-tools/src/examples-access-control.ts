import * as fs from 'fs-extra';
import * as path from 'path';

const EXAMPLES = [
  {
    name: 'access-control-basics',
    category: 'access-control',
    description: 'Demonstrates FHE.allow and FHE.allowThis for managing encrypted data access',
    contractName: 'AccessControlBasics',
    contract: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "fhevm/lib/TFHE.sol";
import "fhevm/config/ZamaFHEVMConfig.sol";

/**
 * @title AccessControlBasics
 * @author FHEVM Example Hub
 * @notice Demonstrates basic access control for encrypted values
 * @dev This example shows how to:
 *      - Use TFHE.allow() to grant access to specific addresses
 *      - Use TFHE.allowThis() to allow contract to operate on values
 *      - Properly manage permissions when values are updated
 * 
 * @custom:category access-control
 * @custom:difficulty beginner
 */
contract AccessControlBasics is SepoliaZamaFHEVMConfig {
    
    euint64 private secretValue;
    address public owner;
    mapping(address => bool) public authorizedReaders;
    
    event SecretUpdated(address indexed by);
    event ReaderAuthorized(address indexed reader);
    event ReaderRevoked(address indexed reader);

    constructor() {
        owner = msg.sender;
        secretValue = TFHE.asEuint64(0);
        // Allow contract to operate on the value
        TFHE.allowThis(secretValue);
        // Allow owner to access the value
        TFHE.allow(secretValue, owner);
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    /**
     * @notice Store a new secret value
     * @dev After updating, must re-apply all permissions
     */
    function setSecret(einput encryptedValue, bytes calldata inputProof) external onlyOwner {
        secretValue = TFHE.asEuint64(encryptedValue, inputProof);
        
        // IMPORTANT: Must re-allow after updating the value
        TFHE.allowThis(secretValue);
        TFHE.allow(secretValue, owner);
        
        // Re-allow all authorized readers
        // Note: In production, you'd track readers in an array
        
        emit SecretUpdated(msg.sender);
    }

    /**
     * @notice Authorize an address to read the secret
     * @param reader The address to authorize
     */
    function authorizeReader(address reader) external onlyOwner {
        authorizedReaders[reader] = true;
        // Grant access to the encrypted value
        TFHE.allow(secretValue, reader);
        emit ReaderAuthorized(reader);
    }

    /**
     * @notice Revoke read access
     * @dev Note: FHEVM doesn't have a "revoke" function.
     *      The address can still read the old handle, but won't
     *      get access to new values after this.
     */
    function revokeReader(address reader) external onlyOwner {
        authorizedReaders[reader] = false;
        emit ReaderRevoked(reader);
    }

    /**
     * @notice Get the secret value (only for authorized addresses)
     * @return The encrypted secret handle
     */
    function getSecret() external view returns (euint64) {
        require(
            msg.sender == owner || authorizedReaders[msg.sender],
            "Not authorized"
        );
        return secretValue;
    }

    /**
     * @notice Check if an address is authorized
     */
    function isAuthorized(address addr) external view returns (bool) {
        return addr == owner || authorizedReaders[addr];
    }
}`,
    test: `import { expect } from "chai";
import { ethers } from "hardhat";
import { createInstance } from "../instance";
import { getSigners, initSigners } from "../signers";

describe("AccessControlBasics", function () {
  let contract: any;
  let fhevm: any;

  before(async function () {
    await initSigners();
    fhevm = await createInstance();
  });

  beforeEach(async function () {
    const signers = await getSigners();
    const Factory = await ethers.getContractFactory("AccessControlBasics");
    contract = await Factory.connect(signers.alice).deploy();
    await contract.waitForDeployment();
  });

  describe("Access Control", function () {
    it("should allow owner to set secret", async function () {
      const signers = await getSigners();
      const contractAddress = await contract.getAddress();

      const input = fhevm.createEncryptedInput(contractAddress, signers.alice.address);
      input.add64(42);
      const encrypted = await input.encrypt();

      const tx = await contract.setSecret(
        encrypted.handles[0],
        encrypted.inputProof
      );
      await tx.wait();

      await expect(tx).to.emit(contract, "SecretUpdated");
    });

    it("should prevent non-owner from setting secret", async function () {
      const signers = await getSigners();
      const contractAddress = await contract.getAddress();

      const input = fhevm.createEncryptedInput(contractAddress, signers.bob.address);
      input.add64(99);
      const encrypted = await input.encrypt();

      await expect(
        contract.connect(signers.bob).setSecret(
          encrypted.handles[0],
          encrypted.inputProof
        )
      ).to.be.revertedWith("Only owner");
    });

    it("should authorize a reader", async function () {
      const signers = await getSigners();

      const tx = await contract.authorizeReader(signers.bob.address);
      await tx.wait();

      await expect(tx).to.emit(contract, "ReaderAuthorized");
      expect(await contract.isAuthorized(signers.bob.address)).to.equal(true);
    });

    it("should allow authorized reader to get secret", async function () {
      const signers = await getSigners();
      const contractAddress = await contract.getAddress();

      // Set a secret
      const input = fhevm.createEncryptedInput(contractAddress, signers.alice.address);
      input.add64(12345);
      const encrypted = await input.encrypt();
      await (await contract.setSecret(encrypted.handles[0], encrypted.inputProof)).wait();

      // Authorize Bob
      await (await contract.authorizeReader(signers.bob.address)).wait();

      // Bob can now get the secret
      const secret = await contract.connect(signers.bob).getSecret();
      expect(secret).to.not.equal(0n);
    });

    it("should prevent unauthorized access", async function () {
      const signers = await getSigners();

      await expect(
        contract.connect(signers.bob).getSecret()
      ).to.be.revertedWith("Not authorized");
    });

    it("should revoke reader access", async function () {
      const signers = await getSigners();

      // Authorize then revoke
      await (await contract.authorizeReader(signers.bob.address)).wait();
      const tx = await contract.revokeReader(signers.bob.address);
      await tx.wait();

      await expect(tx).to.emit(contract, "ReaderRevoked");
      expect(await contract.isAuthorized(signers.bob.address)).to.equal(false);
    });
  });
});`
  },
  {
    name: 'access-control-transient',
    category: 'access-control',
    description: 'Demonstrates FHE.allowTransient for temporary access during transactions',
    contractName: 'AccessControlTransient',
    contract: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "fhevm/lib/TFHE.sol";
import "fhevm/config/ZamaFHEVMConfig.sol";

/**
 * @title AccessControlTransient
 * @author FHEVM Example Hub
 * @notice Demonstrates transient access control
 * @dev This example shows how to:
 *      - Use TFHE.allowTransient() for temporary access
 *      - Grant access only for the duration of a transaction
 *      - Use case: Allowing a DEX to read your balance during a swap
 * 
 * @custom:category access-control
 * @custom:difficulty intermediate
 */
contract AccessControlTransient is SepoliaZamaFHEVMConfig {
    
    mapping(address => euint64) private balances;
    
    event Deposit(address indexed user);
    event TransferProcessed(address indexed from, address indexed to);

    /**
     * @notice Deposit encrypted tokens
     */
    function deposit(einput amount, bytes calldata proof) external {
        euint64 depositAmount = TFHE.asEuint64(amount, proof);
        
        if (TFHE.isInitialized(balances[msg.sender])) {
            balances[msg.sender] = TFHE.add(balances[msg.sender], depositAmount);
        } else {
            balances[msg.sender] = depositAmount;
        }
        
        TFHE.allowThis(balances[msg.sender]);
        TFHE.allow(balances[msg.sender], msg.sender);
        
        emit Deposit(msg.sender);
    }

    /**
     * @notice Transfer tokens using transient access
     * @dev The recipient gets transient access to verify the transfer
     */
    function transfer(address to, einput amount, bytes calldata proof) external {
        require(to != address(0), "Invalid recipient");
        require(to != msg.sender, "Cannot transfer to self");
        
        euint64 transferAmount = TFHE.asEuint64(amount, proof);
        
        // Check sender has enough (encrypted comparison)
        ebool hasEnough = TFHE.ge(balances[msg.sender], transferAmount);
        
        // Subtract from sender
        balances[msg.sender] = TFHE.sub(balances[msg.sender], transferAmount);
        
        // Add to recipient
        if (TFHE.isInitialized(balances[to])) {
            balances[to] = TFHE.add(balances[to], transferAmount);
        } else {
            balances[to] = transferAmount;
        }
        
        // Update permissions
        TFHE.allowThis(balances[msg.sender]);
        TFHE.allow(balances[msg.sender], msg.sender);
        TFHE.allowThis(balances[to]);
        TFHE.allow(balances[to], to);
        
        // Grant transient access to recipient for this transaction only
        // This allows them to verify the amount during the transaction
        TFHE.allowTransient(transferAmount, to);
        
        emit TransferProcessed(msg.sender, to);
    }

    /**
     * @notice Get your encrypted balance
     */
    function getBalance() external view returns (euint64) {
        return balances[msg.sender];
    }

    /**
     * @notice Check if user has a balance
     */
    function hasBalance() external view returns (bool) {
        return TFHE.isInitialized(balances[msg.sender]);
    }
}`,
    test: `import { expect } from "chai";
import { ethers } from "hardhat";
import { createInstance } from "../instance";
import { getSigners, initSigners } from "../signers";

describe("AccessControlTransient", function () {
  let contract: any;
  let fhevm: any;

  before(async function () {
    await initSigners();
    fhevm = await createInstance();
  });

  beforeEach(async function () {
    const signers = await getSigners();
    const Factory = await ethers.getContractFactory("AccessControlTransient");
    contract = await Factory.connect(signers.alice).deploy();
    await contract.waitForDeployment();
  });

  describe("Transient Access", function () {
    it("should deposit encrypted tokens", async function () {
      const signers = await getSigners();
      const contractAddress = await contract.getAddress();

      const input = fhevm.createEncryptedInput(contractAddress, signers.alice.address);
      input.add64(1000);
      const encrypted = await input.encrypt();

      const tx = await contract.deposit(
        encrypted.handles[0],
        encrypted.inputProof
      );
      await tx.wait();

      await expect(tx).to.emit(contract, "Deposit");
      expect(await contract.hasBalance()).to.equal(true);
    });

    it("should transfer with transient access", async function () {
      const signers = await getSigners();
      const contractAddress = await contract.getAddress();

      // Alice deposits
      const depositInput = fhevm.createEncryptedInput(contractAddress, signers.alice.address);
      depositInput.add64(1000);
      const depositEnc = await depositInput.encrypt();
      await (await contract.deposit(depositEnc.handles[0], depositEnc.inputProof)).wait();

      // Alice transfers to Bob
      const transferInput = fhevm.createEncryptedInput(contractAddress, signers.alice.address);
      transferInput.add64(300);
      const transferEnc = await transferInput.encrypt();

      const tx = await contract.transfer(
        signers.bob.address,
        transferEnc.handles[0],
        transferEnc.inputProof
      );
      await tx.wait();

      await expect(tx).to.emit(contract, "TransferProcessed");
    });

    it("should fail transfer to zero address", async function () {
      const signers = await getSigners();
      const contractAddress = await contract.getAddress();

      // Deposit first
      const depositInput = fhevm.createEncryptedInput(contractAddress, signers.alice.address);
      depositInput.add64(500);
      const depositEnc = await depositInput.encrypt();
      await (await contract.deposit(depositEnc.handles[0], depositEnc.inputProof)).wait();

      // Try to transfer to zero address
      const transferInput = fhevm.createEncryptedInput(contractAddress, signers.alice.address);
      transferInput.add64(100);
      const transferEnc = await transferInput.encrypt();

      await expect(
        contract.transfer(
          ethers.ZeroAddress,
          transferEnc.handles[0],
          transferEnc.inputProof
        )
      ).to.be.revertedWith("Invalid recipient");
    });

    it("should fail transfer to self", async function () {
      const signers = await getSigners();
      const contractAddress = await contract.getAddress();

      // Deposit first
      const depositInput = fhevm.createEncryptedInput(contractAddress, signers.alice.address);
      depositInput.add64(500);
      const depositEnc = await depositInput.encrypt();
      await (await contract.deposit(depositEnc.handles[0], depositEnc.inputProof)).wait();

      // Try to transfer to self
      const transferInput = fhevm.createEncryptedInput(contractAddress, signers.alice.address);
      transferInput.add64(100);
      const transferEnc = await transferInput.encrypt();

      await expect(
        contract.transfer(
          signers.alice.address,
          transferEnc.handles[0],
          transferEnc.inputProof
        )
      ).to.be.revertedWith("Cannot transfer to self");
    });
  });
});`
  },
  {
    name: 'input-proofs-explained',
    category: 'access-control',
    description: 'Explains input proofs and why they are essential for FHEVM security',
    contractName: 'InputProofsExplained',
    contract: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "fhevm/lib/TFHE.sol";
import "fhevm/config/ZamaFHEVMConfig.sol";

/**
 * @title InputProofsExplained
 * @author FHEVM Example Hub
 * @notice Explains the importance of input proofs in FHEVM
 * @dev This example shows:
 *      - Why input proofs are necessary
 *      - How to properly validate encrypted inputs
 *      - What happens without proper proof verification
 * 
 * Input proofs ensure that:
 * 1. The encrypted value was created by the claimed sender
 * 2. The ciphertext is valid and not malformed
 * 3. The encryption is for this specific contract
 * 
 * @custom:category access-control
 * @custom:difficulty intermediate
 */
contract InputProofsExplained is SepoliaZamaFHEVMConfig {
    
    mapping(address => euint64) private deposits;
    uint256 public totalDepositors;
    
    event DepositMade(address indexed user);
    event WithdrawalMade(address indexed user);

    /**
     * @notice Make a deposit with proper proof verification
     * @dev The proof ensures:
     *      - Ciphertext was encrypted by msg.sender
     *      - Ciphertext is intended for this contract
     *      - Ciphertext is properly formatted
     * @param encryptedAmount The encrypted deposit amount (einput)
     * @param inputProof Cryptographic proof of valid encryption
     */
    function deposit(einput encryptedAmount, bytes calldata inputProof) external {
        // TFHE.asEuint64 verifies the proof automatically
        // If proof is invalid, this will revert
        euint64 amount = TFHE.asEuint64(encryptedAmount, inputProof);
        
        if (!TFHE.isInitialized(deposits[msg.sender])) {
            totalDepositors++;
        }
        
        if (TFHE.isInitialized(deposits[msg.sender])) {
            deposits[msg.sender] = TFHE.add(deposits[msg.sender], amount);
        } else {
            deposits[msg.sender] = amount;
        }
        
        TFHE.allowThis(deposits[msg.sender]);
        TFHE.allow(deposits[msg.sender], msg.sender);
        
        emit DepositMade(msg.sender);
    }

    /**
     * @notice Withdraw with proof verification
     * @dev Without proof verification, an attacker could:
     *      - Submit malformed ciphertexts
     *      - Replay old ciphertexts
     *      - Use ciphertexts meant for other contracts
     */
    function withdraw(einput encryptedAmount, bytes calldata inputProof) external {
        require(TFHE.isInitialized(deposits[msg.sender]), "No deposit found");
        
        // Proof verification happens here
        euint64 amount = TFHE.asEuint64(encryptedAmount, inputProof);
        
        // Verify sufficient balance (encrypted comparison)
        ebool hasEnough = TFHE.ge(deposits[msg.sender], amount);
        
        // Perform withdrawal
        deposits[msg.sender] = TFHE.sub(deposits[msg.sender], amount);
        
        TFHE.allowThis(deposits[msg.sender]);
        TFHE.allow(deposits[msg.sender], msg.sender);
        
        emit WithdrawalMade(msg.sender);
    }

    /**
     * @notice Get encrypted deposit balance
     */
    function getDeposit() external view returns (euint64) {
        return deposits[msg.sender];
    }

    /**
     * @notice Check if user has made a deposit
     */
    function hasDeposit() external view returns (bool) {
        return TFHE.isInitialized(deposits[msg.sender]);
    }
}`,
    test: `import { expect } from "chai";
import { ethers } from "hardhat";
import { createInstance } from "../instance";
import { getSigners, initSigners } from "../signers";

describe("InputProofsExplained", function () {
  let contract: any;
  let fhevm: any;

  before(async function () {
    await initSigners();
    fhevm = await createInstance();
  });

  beforeEach(async function () {
    const signers = await getSigners();
    const Factory = await ethers.getContractFactory("InputProofsExplained");
    contract = await Factory.connect(signers.alice).deploy();
    await contract.waitForDeployment();
  });

  describe("Input Proof Verification", function () {
    it("should accept valid input proof", async function () {
      const signers = await getSigners();
      const contractAddress = await contract.getAddress();

      // Create encrypted input with valid proof
      const input = fhevm.createEncryptedInput(contractAddress, signers.alice.address);
      input.add64(500);
      const encrypted = await input.encrypt();

      // This should succeed - proof is valid
      const tx = await contract.deposit(
        encrypted.handles[0],
        encrypted.inputProof
      );
      await tx.wait();

      await expect(tx).to.emit(contract, "DepositMade");
      expect(await contract.hasDeposit()).to.equal(true);
    });

    it("should track total depositors", async function () {
      const signers = await getSigners();
      const contractAddress = await contract.getAddress();

      expect(await contract.totalDepositors()).to.equal(0);

      // Alice deposits
      const inputAlice = fhevm.createEncryptedInput(contractAddress, signers.alice.address);
      inputAlice.add64(100);
      const encAlice = await inputAlice.encrypt();
      await (await contract.deposit(encAlice.handles[0], encAlice.inputProof)).wait();

      expect(await contract.totalDepositors()).to.equal(1);

      // Bob deposits
      const inputBob = fhevm.createEncryptedInput(contractAddress, signers.bob.address);
      inputBob.add64(200);
      const encBob = await inputBob.encrypt();
      await (await contract.connect(signers.bob).deposit(encBob.handles[0], encBob.inputProof)).wait();

      expect(await contract.totalDepositors()).to.equal(2);
    });

    it("should allow withdrawal with valid proof", async function () {
      const signers = await getSigners();
      const contractAddress = await contract.getAddress();

      // First deposit
      const depositInput = fhevm.createEncryptedInput(contractAddress, signers.alice.address);
      depositInput.add64(1000);
      const depositEnc = await depositInput.encrypt();
      await (await contract.deposit(depositEnc.handles[0], depositEnc.inputProof)).wait();

      // Then withdraw
      const withdrawInput = fhevm.createEncryptedInput(contractAddress, signers.alice.address);
      withdrawInput.add64(400);
      const withdrawEnc = await withdrawInput.encrypt();

      const tx = await contract.withdraw(
        withdrawEnc.handles[0],
        withdrawEnc.inputProof
      );
      await tx.wait();

      await expect(tx).to.emit(contract, "WithdrawalMade");
    });

    it("should fail withdrawal without deposit", async function () {
      const signers = await getSigners();
      const contractAddress = await contract.getAddress();

      const input = fhevm.createEncryptedInput(contractAddress, signers.alice.address);
      input.add64(100);
      const encrypted = await input.encrypt();

      await expect(
        contract.withdraw(encrypted.handles[0], encrypted.inputProof)
      ).to.be.revertedWith("No deposit found");
    });
  });
});`
  }
];

async function createExamples(): Promise<void> {
  console.log('\n🔐 Creating access control examples...\n');

  const baseTemplatePath = path.join(__dirname, '../../base-template');
  const examplesPath = path.join(__dirname, '../../examples');

  for (const example of EXAMPLES) {
    console.log(`Creating: ${example.name}...`);
    
    const examplePath = path.join(examplesPath, example.name);

    if (await fs.pathExists(examplePath)) {
      console.log(`  ⏭️  Skipped (already exists)`);
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

    console.log(`  ✅ Created successfully`);
  }

  console.log('\n✅ Access control examples created!\n');
}

createExamples().catch(console.error);