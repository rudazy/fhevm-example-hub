import * as fs from 'fs-extra';
import * as path from 'path';

const EXAMPLES = [
  {
    name: 'encrypt-single-value',
    category: 'encryption',
    description: 'Demonstrates how to encrypt a single value and store it on-chain',
    contractName: 'EncryptSingleValue',
    contract: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "fhevm/lib/TFHE.sol";
import "fhevm/config/ZamaFHEVMConfig.sol";

/**
 * @title EncryptSingleValue
 * @author FHEVM Example Hub
 * @notice Demonstrates encrypting and storing a single value
 * @dev This example shows how to:
 *      - Accept encrypted input from users
 *      - Verify input proofs
 *      - Store encrypted values on-chain
 *      - Set proper access permissions
 * 
 * @custom:category encryption
 * @custom:difficulty beginner
 */
contract EncryptSingleValue is SepoliaZamaFHEVMConfig {
    
    /// @notice Mapping of user addresses to their encrypted secret
    mapping(address => euint64) private userSecrets;
    
    /// @notice Emitted when a user stores a secret
    event SecretStored(address indexed user);

    /**
     * @notice Store an encrypted secret
     * @param encryptedSecret The encrypted value (einput)
     * @param inputProof The proof verifying the encryption
     */
    function storeSecret(einput encryptedSecret, bytes calldata inputProof) external {
        // Convert einput to euint64 with proof verification
        euint64 secret = TFHE.asEuint64(encryptedSecret, inputProof);
        
        // Store the encrypted value
        userSecrets[msg.sender] = secret;
        
        // Allow the contract to operate on this value
        TFHE.allowThis(secret);
        
        // Allow the user to access their own secret
        TFHE.allow(secret, msg.sender);
        
        emit SecretStored(msg.sender);
    }

    /**
     * @notice Get the caller's encrypted secret
     * @return The encrypted secret (only usable by authorized addresses)
     */
    function getMySecret() external view returns (euint64) {
        return userSecrets[msg.sender];
    }

    /**
     * @notice Check if caller has stored a secret
     * @return True if the caller has a stored secret
     */
    function hasSecret() external view returns (bool) {
        return TFHE.isInitialized(userSecrets[msg.sender]);
    }
}`,
    test: `import { expect } from "chai";
import { ethers } from "hardhat";
import { createInstance } from "../instance";
import { getSigners, initSigners } from "../signers";

describe("EncryptSingleValue", function () {
  let contract: any;
  let fhevm: any;

  before(async function () {
    await initSigners();
    fhevm = await createInstance();
  });

  beforeEach(async function () {
    const signers = await getSigners();
    const Factory = await ethers.getContractFactory("EncryptSingleValue");
    contract = await Factory.connect(signers.alice).deploy();
    await contract.waitForDeployment();
  });

  describe("Storing Secrets", function () {
    it("should store an encrypted secret", async function () {
      const signers = await getSigners();
      const contractAddress = await contract.getAddress();

      // Create encrypted input
      const input = fhevm.createEncryptedInput(contractAddress, signers.alice.address);
      input.add64(12345);
      const encrypted = await input.encrypt();

      // Store the secret
      const tx = await contract.storeSecret(
        encrypted.handles[0],
        encrypted.inputProof
      );
      await tx.wait();

      await expect(tx).to.emit(contract, "SecretStored");
    });

    it("should report hasSecret correctly", async function () {
      const signers = await getSigners();
      const contractAddress = await contract.getAddress();

      // Initially no secret
      expect(await contract.hasSecret()).to.equal(false);

      // Store a secret
      const input = fhevm.createEncryptedInput(contractAddress, signers.alice.address);
      input.add64(99999);
      const encrypted = await input.encrypt();

      await (await contract.storeSecret(
        encrypted.handles[0],
        encrypted.inputProof
      )).wait();

      // Now has secret
      expect(await contract.hasSecret()).to.equal(true);
    });

    it("should allow different users to store different secrets", async function () {
      const signers = await getSigners();
      const contractAddress = await contract.getAddress();

      // Alice stores a secret
      const inputAlice = fhevm.createEncryptedInput(contractAddress, signers.alice.address);
      inputAlice.add64(111);
      const encryptedAlice = await inputAlice.encrypt();
      await (await contract.storeSecret(
        encryptedAlice.handles[0],
        encryptedAlice.inputProof
      )).wait();

      // Bob stores a different secret
      const inputBob = fhevm.createEncryptedInput(contractAddress, signers.bob.address);
      inputBob.add64(222);
      const encryptedBob = await inputBob.encrypt();
      await (await contract.connect(signers.bob).storeSecret(
        encryptedBob.handles[0],
        encryptedBob.inputProof
      )).wait();

      // Both should have secrets
      expect(await contract.hasSecret()).to.equal(true);
      expect(await contract.connect(signers.bob).hasSecret()).to.equal(true);
    });
  });
});`
  },
  {
    name: 'encrypt-multiple-values',
    category: 'encryption',
    description: 'Demonstrates how to encrypt and handle multiple values in a single transaction',
    contractName: 'EncryptMultipleValues',
    contract: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "fhevm/lib/TFHE.sol";
import "fhevm/config/ZamaFHEVMConfig.sol";

/**
 * @title EncryptMultipleValues
 * @author FHEVM Example Hub
 * @notice Demonstrates encrypting multiple values in one transaction
 * @dev This example shows how to:
 *      - Accept multiple encrypted inputs
 *      - Process multiple encrypted values together
 *      - Store structured encrypted data
 * 
 * @custom:category encryption
 * @custom:difficulty intermediate
 */
contract EncryptMultipleValues is SepoliaZamaFHEVMConfig {
    
    struct EncryptedCoordinates {
        euint64 x;
        euint64 y;
        euint64 z;
    }
    
    mapping(address => EncryptedCoordinates) private userCoordinates;
    
    event CoordinatesStored(address indexed user);

    /**
     * @notice Store encrypted 3D coordinates
     * @param encX Encrypted X coordinate
     * @param proofX Proof for X
     * @param encY Encrypted Y coordinate
     * @param proofY Proof for Y
     * @param encZ Encrypted Z coordinate
     * @param proofZ Proof for Z
     */
    function storeCoordinates(
        einput encX, bytes calldata proofX,
        einput encY, bytes calldata proofY,
        einput encZ, bytes calldata proofZ
    ) external {
        euint64 x = TFHE.asEuint64(encX, proofX);
        euint64 y = TFHE.asEuint64(encY, proofY);
        euint64 z = TFHE.asEuint64(encZ, proofZ);
        
        userCoordinates[msg.sender] = EncryptedCoordinates(x, y, z);
        
        // Set permissions for all values
        TFHE.allowThis(x);
        TFHE.allowThis(y);
        TFHE.allowThis(z);
        TFHE.allow(x, msg.sender);
        TFHE.allow(y, msg.sender);
        TFHE.allow(z, msg.sender);
        
        emit CoordinatesStored(msg.sender);
    }

    /**
     * @notice Calculate encrypted distance from origin (simplified: x + y + z)
     * @return The sum of all coordinates (encrypted)
     */
    function calculateSum() external view returns (euint64) {
        EncryptedCoordinates storage coords = userCoordinates[msg.sender];
        euint64 sum = TFHE.add(coords.x, coords.y);
        sum = TFHE.add(sum, coords.z);
        return sum;
    }

    /**
     * @notice Get user's encrypted coordinates
     */
    function getMyCoordinates() external view returns (euint64, euint64, euint64) {
        EncryptedCoordinates storage coords = userCoordinates[msg.sender];
        return (coords.x, coords.y, coords.z);
    }
}`,
    test: `import { expect } from "chai";
import { ethers } from "hardhat";
import { createInstance } from "../instance";
import { getSigners, initSigners } from "../signers";

describe("EncryptMultipleValues", function () {
  let contract: any;
  let fhevm: any;

  before(async function () {
    await initSigners();
    fhevm = await createInstance();
  });

  beforeEach(async function () {
    const signers = await getSigners();
    const Factory = await ethers.getContractFactory("EncryptMultipleValues");
    contract = await Factory.connect(signers.alice).deploy();
    await contract.waitForDeployment();
  });

  describe("Multiple Value Encryption", function () {
    it("should store multiple encrypted coordinates", async function () {
      const signers = await getSigners();
      const contractAddress = await contract.getAddress();

      // Create encrypted inputs for X, Y, Z
      const inputX = fhevm.createEncryptedInput(contractAddress, signers.alice.address);
      inputX.add64(10);
      const encX = await inputX.encrypt();

      const inputY = fhevm.createEncryptedInput(contractAddress, signers.alice.address);
      inputY.add64(20);
      const encY = await inputY.encrypt();

      const inputZ = fhevm.createEncryptedInput(contractAddress, signers.alice.address);
      inputZ.add64(30);
      const encZ = await inputZ.encrypt();

      // Store all coordinates
      const tx = await contract.storeCoordinates(
        encX.handles[0], encX.inputProof,
        encY.handles[0], encY.inputProof,
        encZ.handles[0], encZ.inputProof
      );
      await tx.wait();

      await expect(tx).to.emit(contract, "CoordinatesStored");
    });

    it("should retrieve encrypted coordinates", async function () {
      const signers = await getSigners();
      const contractAddress = await contract.getAddress();

      // Store coordinates first
      const inputX = fhevm.createEncryptedInput(contractAddress, signers.alice.address);
      inputX.add64(5);
      const encX = await inputX.encrypt();

      const inputY = fhevm.createEncryptedInput(contractAddress, signers.alice.address);
      inputY.add64(15);
      const encY = await inputY.encrypt();

      const inputZ = fhevm.createEncryptedInput(contractAddress, signers.alice.address);
      inputZ.add64(25);
      const encZ = await inputZ.encrypt();

      await (await contract.storeCoordinates(
        encX.handles[0], encX.inputProof,
        encY.handles[0], encY.inputProof,
        encZ.handles[0], encZ.inputProof
      )).wait();

      // Retrieve coordinates
      const [x, y, z] = await contract.getMyCoordinates();
      
      // Values are encrypted handles
      expect(x).to.not.equal(0n);
      expect(y).to.not.equal(0n);
      expect(z).to.not.equal(0n);
    });

    it("should calculate sum of coordinates", async function () {
      const signers = await getSigners();
      const contractAddress = await contract.getAddress();

      // Store coordinates
      const inputX = fhevm.createEncryptedInput(contractAddress, signers.alice.address);
      inputX.add64(100);
      const encX = await inputX.encrypt();

      const inputY = fhevm.createEncryptedInput(contractAddress, signers.alice.address);
      inputY.add64(200);
      const encY = await inputY.encrypt();

      const inputZ = fhevm.createEncryptedInput(contractAddress, signers.alice.address);
      inputZ.add64(300);
      const encZ = await inputZ.encrypt();

      await (await contract.storeCoordinates(
        encX.handles[0], encX.inputProof,
        encY.handles[0], encY.inputProof,
        encZ.handles[0], encZ.inputProof
      )).wait();

      // Get sum (would be 600 if decrypted)
      const sum = await contract.calculateSum();
      expect(sum).to.not.equal(0n);
    });
  });
});`
  }
];

async function createExamples(): Promise<void> {
  console.log('\n🔐 Creating encryption examples...\n');

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

    // Clean contracts
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

    // Clean tests
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

    // Metadata
    await fs.writeFile(
      path.join(examplePath, 'example.json'),
      JSON.stringify({
        name: example.name,
        category: example.category,
        description: example.description,
        createdAt: new Date().toISOString()
      }, null, 2)
    );

    // README
    await fs.writeFile(
      path.join(examplePath, 'README.md'),
      `# ${example.name.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}\n\n> Category: ${example.category}\n\n${example.description}\n\n## Quick Start\n\n\`\`\`bash\nnpm install\nnpm run compile\nnpm run test\n\`\`\`\n`
    );

    console.log(`  ✅ Created successfully`);
  }

  console.log('\n✅ Encryption examples created!\n');
}

createExamples().catch(console.error);