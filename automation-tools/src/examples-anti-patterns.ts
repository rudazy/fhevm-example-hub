import * as fs from 'fs-extra';
import * as path from 'path';

const EXAMPLES = [
  {
    name: 'anti-pattern-view-functions',
    category: 'anti-patterns',
    description: 'Demonstrates why view functions cannot return decrypted encrypted values',
    contractName: 'AntiPatternViewFunctions',
    contract: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "fhevm/lib/TFHE.sol";
import "fhevm/config/ZamaFHEVMConfig.sol";

/**
 * @title AntiPatternViewFunctions
 * @author FHEVM Example Hub
 * @notice Demonstrates a common anti-pattern: trying to decrypt in view functions
 * @dev IMPORTANT: This shows what NOT to do!
 * 
 * Anti-pattern explained:
 * - View functions cannot decrypt encrypted values
 * - Decryption requires async Gateway calls
 * - You can only return encrypted handles from view functions
 * 
 * @custom:category anti-patterns
 * @custom:difficulty beginner
 */
contract AntiPatternViewFunctions is SepoliaZamaFHEVMConfig {
    
    euint64 private secretBalance;
    address public owner;

    constructor() {
        owner = msg.sender;
        secretBalance = TFHE.asEuint64(1000);
        TFHE.allowThis(secretBalance);
        TFHE.allow(secretBalance, owner);
    }

    /**
     * @notice CORRECT: Returns encrypted handle
     * @dev The caller can then request decryption via Gateway
     */
    function getEncryptedBalance() external view returns (euint64) {
        return secretBalance;
    }

    /**
     * @notice WRONG APPROACH: You might think you can do this
     * @dev This function shows what developers often TRY to do
     *      but it will NOT work as expected.
     *      
     *      You CANNOT simply cast euint64 to uint64 and get the value.
     *      The "value" you get is just the handle ID, not the actual value.
     */
    function getBalanceWrongApproach() external view returns (uint256) {
        // This returns the HANDLE, not the decrypted value!
        // This is a common mistake - developers think they're getting
        // the actual value but they're just getting a reference number
        return euint64.unwrap(secretBalance);
    }

    /**
     * @notice Update balance (for testing)
     */
    function setBalance(einput newBalance, bytes calldata proof) external {
        require(msg.sender == owner, "Only owner");
        secretBalance = TFHE.asEuint64(newBalance, proof);
        TFHE.allowThis(secretBalance);
        TFHE.allow(secretBalance, owner);
    }
}

/**
 * LESSON LEARNED:
 * ===============
 * 1. View functions can only return encrypted handles (euint64, ebool, etc.)
 * 2. To get actual decrypted values, you must use Gateway.requestDecryption()
 * 3. Decryption is ASYNC - you submit a request and receive a callback
 * 4. Never assume you can "read" encrypted values directly
 */`,
    test: `import { expect } from "chai";
import { ethers } from "hardhat";
import { createInstance } from "../instance";
import { getSigners, initSigners } from "../signers";

/**
 * @title AntiPatternViewFunctions Tests
 * @notice Tests demonstrating the view function anti-pattern
 */
describe("AntiPatternViewFunctions", function () {
  let contract: any;
  let fhevm: any;

  before(async function () {
    await initSigners();
    fhevm = await createInstance();
  });

  beforeEach(async function () {
    const signers = await getSigners();
    const Factory = await ethers.getContractFactory("AntiPatternViewFunctions");
    contract = await Factory.connect(signers.alice).deploy();
    await contract.waitForDeployment();
  });

  describe("View Function Anti-Pattern", function () {
    /**
     * @notice Demonstrates correct approach - getting encrypted handle
     */
    it("CORRECT: should return encrypted handle from view function", async function () {
      const encryptedBalance = await contract.getEncryptedBalance();
      
      // This is a handle (reference), not the actual value
      // The handle is a bigint that references the encrypted data
      expect(typeof encryptedBalance).to.equal("bigint");
      expect(encryptedBalance).to.not.equal(0n);
      
      // To get the actual value, you would need to use Gateway decryption
      // which is an async process (not possible in a simple view call)
    });

    /**
     * @notice Demonstrates the anti-pattern result
     */
    it("ANTI-PATTERN: wrong approach returns handle ID, not actual value", async function () {
      const wrongValue = await contract.getBalanceWrongApproach();
      
      // This does NOT return 1000 (the actual balance)
      // It returns the handle ID which is just a reference number
      expect(wrongValue).to.not.equal(1000n);
      
      // The returned value is meaningless without proper decryption
      console.log("  [INFO] Wrong approach returned:", wrongValue.toString());
      console.log("  [INFO] This is the handle ID, NOT the balance of 1000");
    });

    /**
     * @notice Shows that encrypted values stay encrypted
     */
    it("should demonstrate that values remain encrypted", async function () {
      const signers = await getSigners();
      const contractAddress = await contract.getAddress();

      // Set a new balance
      const input = fhevm.createEncryptedInput(contractAddress, signers.alice.address);
      input.add64(5000);
      const encrypted = await input.encrypt();

      await (await contract.setBalance(
        encrypted.handles[0],
        encrypted.inputProof
      )).wait();

      // Get the "wrong" value
      const wrongValue = await contract.getBalanceWrongApproach();
      
      // Still not 5000
      expect(wrongValue).to.not.equal(5000n);
    });
  });
});`
  },
  {
    name: 'anti-pattern-missing-allow',
    category: 'anti-patterns',
    description: 'Demonstrates the consequences of forgetting TFHE.allowThis() permissions',
    contractName: 'AntiPatternMissingAllow',
    contract: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "fhevm/lib/TFHE.sol";
import "fhevm/config/ZamaFHEVMConfig.sol";

/**
 * @title AntiPatternMissingAllow
 * @author FHEVM Example Hub
 * @notice Demonstrates what happens when you forget TFHE.allowThis()
 * @dev IMPORTANT: This shows what NOT to do!
 * 
 * Anti-pattern explained:
 * - Every encrypted value needs explicit permissions
 * - Forgetting TFHE.allowThis() means the contract cannot operate on the value
 * - Forgetting TFHE.allow(value, user) means the user cannot access it
 * 
 * @custom:category anti-patterns
 * @custom:difficulty beginner
 */
contract AntiPatternMissingAllow is SepoliaZamaFHEVMConfig {
    
    euint64 private correctlyPermissioned;
    euint64 private missingContractPermission;
    euint64 private missingUserPermission;
    
    address public owner;

    constructor() {
        owner = msg.sender;
    }

    /**
     * @notice CORRECT: Stores value with all proper permissions
     */
    function storeCorrectly(einput value, bytes calldata proof) external {
        correctlyPermissioned = TFHE.asEuint64(value, proof);
        
        // Allow contract to operate on this value
        TFHE.allowThis(correctlyPermissioned);
        
        // Allow the user to access this value
        TFHE.allow(correctlyPermissioned, msg.sender);
    }

    /**
     * @notice WRONG: Missing TFHE.allowThis()
     * @dev Contract operations on this value will fail
     */
    function storeMissingAllowThis(einput value, bytes calldata proof) external {
        missingContractPermission = TFHE.asEuint64(value, proof);
        
        // OOPS! Forgot TFHE.allowThis()
        // The contract cannot perform operations on this value
        
        TFHE.allow(missingContractPermission, msg.sender);
    }

    /**
     * @notice WRONG: Missing TFHE.allow() for user
     * @dev User will not be able to access this value
     */
    function storeMissingUserAllow(einput value, bytes calldata proof) external {
        missingUserPermission = TFHE.asEuint64(value, proof);
        
        TFHE.allowThis(missingUserPermission);
        
        // OOPS! Forgot TFHE.allow(value, msg.sender)
        // The user cannot access this value for re-encryption
    }

    /**
     * @notice Try to add to correctly permissioned value - WORKS
     */
    function addToCorrect(einput value, bytes calldata proof) external {
        euint64 toAdd = TFHE.asEuint64(value, proof);
        correctlyPermissioned = TFHE.add(correctlyPermissioned, toAdd);
        TFHE.allowThis(correctlyPermissioned);
        TFHE.allow(correctlyPermissioned, msg.sender);
    }

    /**
     * @notice Try to add to value missing allowThis - MAY FAIL
     * @dev This operation may fail because contract lacks permission
     */
    function addToMissingAllowThis(einput value, bytes calldata proof) external {
        euint64 toAdd = TFHE.asEuint64(value, proof);
        // This may fail or produce unexpected results
        missingContractPermission = TFHE.add(missingContractPermission, toAdd);
        TFHE.allow(missingContractPermission, msg.sender);
    }

    /**
     * @notice Get correctly permissioned value
     */
    function getCorrect() external view returns (euint64) {
        return correctlyPermissioned;
    }

    /**
     * @notice Get value with missing contract permission
     */
    function getMissingAllowThis() external view returns (euint64) {
        return missingContractPermission;
    }

    /**
     * @notice Get value with missing user permission
     */
    function getMissingUserAllow() external view returns (euint64) {
        return missingUserPermission;
    }
}

/**
 * LESSON LEARNED:
 * ===============
 * 1. ALWAYS call TFHE.allowThis(value) after creating/modifying encrypted values
 * 2. ALWAYS call TFHE.allow(value, user) for users who need access
 * 3. Permissions must be re-applied after any operation that creates a new handle
 * 4. TFHE.add(), TFHE.sub(), etc. create NEW handles - permissions don't carry over
 */`,
    test: `import { expect } from "chai";
import { ethers } from "hardhat";
import { createInstance } from "../instance";
import { getSigners, initSigners } from "../signers";

/**
 * @title AntiPatternMissingAllow Tests
 * @notice Tests demonstrating the missing permission anti-pattern
 */
describe("AntiPatternMissingAllow", function () {
  let contract: any;
  let fhevm: any;

  before(async function () {
    await initSigners();
    fhevm = await createInstance();
  });

  beforeEach(async function () {
    const signers = await getSigners();
    const Factory = await ethers.getContractFactory("AntiPatternMissingAllow");
    contract = await Factory.connect(signers.alice).deploy();
    await contract.waitForDeployment();
  });

  describe("Permission Anti-Patterns", function () {
    /**
     * @notice CORRECT: Properly permissioned storage works
     */
    it("CORRECT: should store and retrieve with proper permissions", async function () {
      const signers = await getSigners();
      const contractAddress = await contract.getAddress();

      const input = fhevm.createEncryptedInput(contractAddress, signers.alice.address);
      input.add64(100);
      const encrypted = await input.encrypt();

      await (await contract.storeCorrectly(
        encrypted.handles[0],
        encrypted.inputProof
      )).wait();

      const handle = await contract.getCorrect();
      expect(handle).to.not.equal(0n);
    });

    /**
     * @notice CORRECT: Operations work on properly permissioned values
     */
    it("CORRECT: should perform operations on properly permissioned value", async function () {
      const signers = await getSigners();
      const contractAddress = await contract.getAddress();

      // Store initial value
      const input1 = fhevm.createEncryptedInput(contractAddress, signers.alice.address);
      input1.add64(100);
      const enc1 = await input1.encrypt();
      await (await contract.storeCorrectly(enc1.handles[0], enc1.inputProof)).wait();

      // Add to it
      const input2 = fhevm.createEncryptedInput(contractAddress, signers.alice.address);
      input2.add64(50);
      const enc2 = await input2.encrypt();
      
      // This should work
      const tx = await contract.addToCorrect(enc2.handles[0], enc2.inputProof);
      await tx.wait();
      
      // Value is now 150 (encrypted)
    });

    /**
     * @notice ANTI-PATTERN: Missing allowThis causes issues
     */
    it("ANTI-PATTERN: should demonstrate missing allowThis issue", async function () {
      const signers = await getSigners();
      const contractAddress = await contract.getAddress();

      const input = fhevm.createEncryptedInput(contractAddress, signers.alice.address);
      input.add64(200);
      const encrypted = await input.encrypt();

      // This stores but without contract permission
      await (await contract.storeMissingAllowThis(
        encrypted.handles[0],
        encrypted.inputProof
      )).wait();

      console.log("  [INFO] Value stored but contract cannot operate on it");
      console.log("  [INFO] Future operations on this value may fail");
    });

    /**
     * @notice ANTI-PATTERN: Missing user allow causes access issues
     */
    it("ANTI-PATTERN: should demonstrate missing user allow issue", async function () {
      const signers = await getSigners();
      const contractAddress = await contract.getAddress();

      const input = fhevm.createEncryptedInput(contractAddress, signers.alice.address);
      input.add64(300);
      const encrypted = await input.encrypt();

      await (await contract.storeMissingUserAllow(
        encrypted.handles[0],
        encrypted.inputProof
      )).wait();

      console.log("  [INFO] Value stored but user cannot request re-encryption");
      console.log("  [INFO] User will not be able to decrypt this value");
    });
  });
});`
  },
  {
    name: 'anti-pattern-common-mistakes',
    category: 'anti-patterns',
    description: 'Collection of common FHEVM mistakes and how to avoid them',
    contractName: 'AntiPatternCommonMistakes',
    contract: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "fhevm/lib/TFHE.sol";
import "fhevm/config/ZamaFHEVMConfig.sol";

/**
 * @title AntiPatternCommonMistakes
 * @author FHEVM Example Hub
 * @notice Collection of common FHEVM mistakes
 * @dev This contract shows multiple anti-patterns in one place
 * 
 * @custom:category anti-patterns
 * @custom:difficulty intermediate
 */
contract AntiPatternCommonMistakes is SepoliaZamaFHEVMConfig {
    
    euint64 private value1;
    euint64 private value2;
    address public owner;

    constructor() {
        owner = msg.sender;
    }

    // ========================================
    // MISTAKE 1: Comparing encrypted to plaintext incorrectly
    // ========================================
    
    /**
     * @notice WRONG: Direct comparison does not work as expected
     * @dev You cannot compare euint64 with uint64 directly
     */
    function wrongComparison(einput encValue, bytes calldata proof) external view returns (bool) {
        euint64 encrypted = TFHE.asEuint64(encValue, proof);
        
        // WRONG: This does not compare the actual values
        // It compares handles/references
        return euint64.unwrap(encrypted) > 100;
    }

    /**
     * @notice CORRECT: Use TFHE.gt for encrypted comparison
     */
    function correctComparison(einput encValue, bytes calldata proof) external returns (ebool) {
        euint64 encrypted = TFHE.asEuint64(encValue, proof);
        euint64 threshold = TFHE.asEuint64(100);
        
        ebool result = TFHE.gt(encrypted, threshold);
        TFHE.allowThis(result);
        TFHE.allow(result, msg.sender);
        
        return result;
    }

    // ========================================
    // MISTAKE 2: Not re-applying permissions after operations
    // ========================================

    /**
     * @notice WRONG: Permissions lost after operation
     */
    function wrongPermissionHandling(einput a, bytes calldata proofA, einput b, bytes calldata proofB) external {
        euint64 encA = TFHE.asEuint64(a, proofA);
        euint64 encB = TFHE.asEuint64(b, proofB);
        
        TFHE.allowThis(encA);
        TFHE.allowThis(encB);
        
        // This creates a NEW handle
        value1 = TFHE.add(encA, encB);
        
        // WRONG: Forgot to allowThis on the NEW value
        // value1 now has no permissions!
    }

    /**
     * @notice CORRECT: Re-apply permissions after every operation
     */
    function correctPermissionHandling(einput a, bytes calldata proofA, einput b, bytes calldata proofB) external {
        euint64 encA = TFHE.asEuint64(a, proofA);
        euint64 encB = TFHE.asEuint64(b, proofB);
        
        // Create new value
        value2 = TFHE.add(encA, encB);
        
        // CORRECT: Apply permissions to the new handle
        TFHE.allowThis(value2);
        TFHE.allow(value2, msg.sender);
    }

    // ========================================
    // MISTAKE 3: Assuming encrypted zero is falsy
    // ========================================

    /**
     * @notice WRONG: Cannot use encrypted value in boolean context
     */
    function wrongZeroCheck() external view returns (bool) {
        // WRONG: This checks if the HANDLE is zero, not the encrypted value
        return euint64.unwrap(value1) != 0;
    }

    /**
     * @notice CORRECT: Use TFHE.ne for zero check
     */
    function correctZeroCheck() external returns (ebool) {
        euint64 zero = TFHE.asEuint64(0);
        ebool result = TFHE.ne(value2, zero);
        TFHE.allowThis(result);
        TFHE.allow(result, msg.sender);
        return result;
    }

    // ========================================
    // MISTAKE 4: Returning encrypted values to unauthorized users
    // ========================================

    /**
     * @notice WRONG: No access control on encrypted data
     */
    function wrongNoAccessControl() external view returns (euint64) {
        // Anyone can call this, but they won't be able to decrypt
        // without proper TFHE.allow() - confusing API design
        return value1;
    }

    /**
     * @notice CORRECT: Explicit access control
     */
    function correctWithAccessControl() external view returns (euint64) {
        require(msg.sender == owner, "Not authorized");
        return value2;
    }

    /**
     * @notice Get values for testing
     */
    function getValue1() external view returns (euint64) {
        return value1;
    }

    function getValue2() external view returns (euint64) {
        return value2;
    }
}

/**
 * LESSONS LEARNED:
 * ================
 * 1. Never compare encrypted values using regular operators (>, <, ==)
 * 2. Always re-apply permissions after ANY operation that creates new handles
 * 3. Cannot use encrypted values in boolean contexts
 * 4. Add explicit access control even for encrypted returns
 * 5. TFHE operations create NEW handles - old permissions don't transfer
 */`,
    test: `import { expect } from "chai";
import { ethers } from "hardhat";
import { createInstance } from "../instance";
import { getSigners, initSigners } from "../signers";

/**
 * @title AntiPatternCommonMistakes Tests
 * @notice Tests demonstrating common FHEVM mistakes
 */
describe("AntiPatternCommonMistakes", function () {
  let contract: any;
  let fhevm: any;

  before(async function () {
    await initSigners();
    fhevm = await createInstance();
  });

  beforeEach(async function () {
    const signers = await getSigners();
    const Factory = await ethers.getContractFactory("AntiPatternCommonMistakes");
    contract = await Factory.connect(signers.alice).deploy();
    await contract.waitForDeployment();
  });

  describe("Common Mistakes", function () {
    it("should demonstrate wrong comparison returns meaningless result", async function () {
      const signers = await getSigners();
      const contractAddress = await contract.getAddress();

      const input = fhevm.createEncryptedInput(contractAddress, signers.alice.address);
      input.add64(50);
      const encrypted = await input.encrypt();

      // This comparison is meaningless - comparing handle IDs
      const wrongResult = await contract.wrongComparison(
        encrypted.handles[0],
        encrypted.inputProof
      );

      console.log("  [INFO] Wrong comparison result:", wrongResult);
      console.log("  [INFO] This compares handle ID > 100, not actual value 50 > 100");
    });

    it("should demonstrate correct encrypted comparison", async function () {
      const signers = await getSigners();
      const contractAddress = await contract.getAddress();

      const input = fhevm.createEncryptedInput(contractAddress, signers.alice.address);
      input.add64(150);
      const encrypted = await input.encrypt();

      const tx = await contract.correctComparison(
        encrypted.handles[0],
        encrypted.inputProof
      );
      await tx.wait();

      // Returns ebool handle - would need decryption to see true/false
      console.log("  [INFO] Correct comparison returns encrypted boolean");
    });

    it("should demonstrate permission handling", async function () {
      const signers = await getSigners();
      const contractAddress = await contract.getAddress();

      const inputA = fhevm.createEncryptedInput(contractAddress, signers.alice.address);
      inputA.add64(10);
      const encA = await inputA.encrypt();

      const inputB = fhevm.createEncryptedInput(contractAddress, signers.alice.address);
      inputB.add64(20);
      const encB = await inputB.encrypt();

      // Correct way
      await (await contract.correctPermissionHandling(
        encA.handles[0], encA.inputProof,
        encB.handles[0], encB.inputProof
      )).wait();

      const value2 = await contract.getValue2();
      expect(value2).to.not.equal(0n);
    });

    it("should demonstrate access control importance", async function () {
      const signers = await getSigners();

      // Bob tries to access owner-only function
      await expect(
        contract.connect(signers.bob).correctWithAccessControl()
      ).to.be.revertedWith("Not authorized");
    });
  });
});`
  }
];

async function createExamples(): Promise<void> {
  console.log('\nCreating anti-pattern examples...\n');

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

  console.log('\n[DONE] Anti-pattern examples created!\n');
}

createExamples().catch(console.error);