import * as fs from 'fs-extra';
import * as path from 'path';

/**
 * @title Batch Example Creator
 * @notice Creates all required examples for the FHEVM Example Hub
 */

interface ExampleDefinition {
  name: string;
  category: string;
  description: string;
  contractName: string;
  contract: string;
  test: string;
}

const EXAMPLES: ExampleDefinition[] = [
  // BASIC EXAMPLES
  {
    name: 'arithmetic-operations',
    category: 'basic',
    description: 'Demonstrates FHE arithmetic operations: add, sub, mul, div',
    contractName: 'ArithmeticOperations',
    contract: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "fhevm/lib/TFHE.sol";
import "fhevm/config/ZamaFHEVMConfig.sol";

/**
 * @title ArithmeticOperations
 * @author FHEVM Example Hub
 * @notice Demonstrates basic FHE arithmetic operations
 * @dev This example shows how to:
 *      - Perform encrypted addition (FHE.add)
 *      - Perform encrypted subtraction (FHE.sub)
 *      - Perform encrypted multiplication (FHE.mul)
 *      - Perform encrypted division (FHE.div)
 * 
 * @custom:category basic
 * @custom:difficulty beginner
 */
contract ArithmeticOperations is SepoliaZamaFHEVMConfig {
    
    euint64 private result;
    address public owner;

    constructor() {
        owner = msg.sender;
        result = TFHE.asEuint64(0);
        TFHE.allowThis(result);
        TFHE.allow(result, owner);
    }

    /**
     * @notice Adds two encrypted values
     * @param a First encrypted input
     * @param aProof Proof for first input
     * @param b Second encrypted input
     * @param bProof Proof for second input
     */
    function add(
        einput a, bytes calldata aProof,
        einput b, bytes calldata bProof
    ) external {
        euint64 encA = TFHE.asEuint64(a, aProof);
        euint64 encB = TFHE.asEuint64(b, bProof);
        result = TFHE.add(encA, encB);
        TFHE.allowThis(result);
        TFHE.allow(result, owner);
    }

    /**
     * @notice Subtracts two encrypted values
     */
    function subtract(
        einput a, bytes calldata aProof,
        einput b, bytes calldata bProof
    ) external {
        euint64 encA = TFHE.asEuint64(a, aProof);
        euint64 encB = TFHE.asEuint64(b, bProof);
        result = TFHE.sub(encA, encB);
        TFHE.allowThis(result);
        TFHE.allow(result, owner);
    }

    /**
     * @notice Multiplies two encrypted values
     */
    function multiply(
        einput a, bytes calldata aProof,
        einput b, bytes calldata bProof
    ) external {
        euint64 encA = TFHE.asEuint64(a, aProof);
        euint64 encB = TFHE.asEuint64(b, bProof);
        result = TFHE.mul(encA, encB);
        TFHE.allowThis(result);
        TFHE.allow(result, owner);
    }

    /**
     * @notice Divides two encrypted values
     */
    function divide(
        einput a, bytes calldata aProof,
        einput b, bytes calldata bProof
    ) external {
        euint64 encA = TFHE.asEuint64(a, aProof);
        euint64 encB = TFHE.asEuint64(b, bProof);
        result = TFHE.div(encA, encB);
        TFHE.allowThis(result);
        TFHE.allow(result, owner);
    }

    function getResult() external view returns (euint64) {
        return result;
    }
}`,
    test: `import { expect } from "chai";
import { ethers } from "hardhat";
import { createInstance } from "../instance";
import { getSigners, initSigners } from "../signers";

describe("ArithmeticOperations", function () {
  let contract: any;
  let fhevm: any;

  before(async function () {
    await initSigners();
    fhevm = await createInstance();
  });

  beforeEach(async function () {
    const signers = await getSigners();
    const Factory = await ethers.getContractFactory("ArithmeticOperations");
    contract = await Factory.connect(signers.alice).deploy();
    await contract.waitForDeployment();
  });

  it("should add two encrypted values", async function () {
    const signers = await getSigners();
    const contractAddress = await contract.getAddress();

    const inputA = fhevm.createEncryptedInput(contractAddress, signers.alice.address);
    inputA.add64(10);
    const encA = await inputA.encrypt();

    const inputB = fhevm.createEncryptedInput(contractAddress, signers.alice.address);
    inputB.add64(5);
    const encB = await inputB.encrypt();

    const tx = await contract.add(
      encA.handles[0], encA.inputProof,
      encB.handles[0], encB.inputProof
    );
    await tx.wait();
    // Result would be 15 (verifiable via decryption)
  });

  it("should subtract two encrypted values", async function () {
    const signers = await getSigners();
    const contractAddress = await contract.getAddress();

    const inputA = fhevm.createEncryptedInput(contractAddress, signers.alice.address);
    inputA.add64(20);
    const encA = await inputA.encrypt();

    const inputB = fhevm.createEncryptedInput(contractAddress, signers.alice.address);
    inputB.add64(8);
    const encB = await inputB.encrypt();

    const tx = await contract.subtract(
      encA.handles[0], encA.inputProof,
      encB.handles[0], encB.inputProof
    );
    await tx.wait();
    // Result would be 12
  });

  it("should multiply two encrypted values", async function () {
    const signers = await getSigners();
    const contractAddress = await contract.getAddress();

    const inputA = fhevm.createEncryptedInput(contractAddress, signers.alice.address);
    inputA.add64(6);
    const encA = await inputA.encrypt();

    const inputB = fhevm.createEncryptedInput(contractAddress, signers.alice.address);
    inputB.add64(7);
    const encB = await inputB.encrypt();

    const tx = await contract.multiply(
      encA.handles[0], encA.inputProof,
      encB.handles[0], encB.inputProof
    );
    await tx.wait();
    // Result would be 42
  });

  it("should divide two encrypted values", async function () {
    const signers = await getSigners();
    const contractAddress = await contract.getAddress();

    const inputA = fhevm.createEncryptedInput(contractAddress, signers.alice.address);
    inputA.add64(100);
    const encA = await inputA.encrypt();

    const inputB = fhevm.createEncryptedInput(contractAddress, signers.alice.address);
    inputB.add64(10);
    const encB = await inputB.encrypt();

    const tx = await contract.divide(
      encA.handles[0], encA.inputProof,
      encB.handles[0], encB.inputProof
    );
    await tx.wait();
    // Result would be 10
  });
});`
  },
  {
    name: 'equality-comparison',
    category: 'basic',
    description: 'Demonstrates FHE comparison operations: eq, ne, gt, lt, gte, lte',
    contractName: 'EqualityComparison',
    contract: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "fhevm/lib/TFHE.sol";
import "fhevm/config/ZamaFHEVMConfig.sol";

/**
 * @title EqualityComparison
 * @author FHEVM Example Hub
 * @notice Demonstrates FHE comparison operations
 * @dev This example shows how to:
 *      - Compare encrypted values for equality (FHE.eq)
 *      - Compare encrypted values for inequality (FHE.ne)
 *      - Compare encrypted values with greater/less than (FHE.gt, FHE.lt)
 * 
 * @custom:category basic
 * @custom:difficulty beginner
 */
contract EqualityComparison is SepoliaZamaFHEVMConfig {
    
    ebool private lastComparisonResult;
    address public owner;

    constructor() {
        owner = msg.sender;
    }

    /**
     * @notice Checks if two encrypted values are equal
     */
    function isEqual(
        einput a, bytes calldata aProof,
        einput b, bytes calldata bProof
    ) external {
        euint64 encA = TFHE.asEuint64(a, aProof);
        euint64 encB = TFHE.asEuint64(b, bProof);
        lastComparisonResult = TFHE.eq(encA, encB);
        TFHE.allowThis(lastComparisonResult);
        TFHE.allow(lastComparisonResult, owner);
    }

    /**
     * @notice Checks if two encrypted values are not equal
     */
    function isNotEqual(
        einput a, bytes calldata aProof,
        einput b, bytes calldata bProof
    ) external {
        euint64 encA = TFHE.asEuint64(a, aProof);
        euint64 encB = TFHE.asEuint64(b, bProof);
        lastComparisonResult = TFHE.ne(encA, encB);
        TFHE.allowThis(lastComparisonResult);
        TFHE.allow(lastComparisonResult, owner);
    }

    /**
     * @notice Checks if a is greater than b
     */
    function isGreaterThan(
        einput a, bytes calldata aProof,
        einput b, bytes calldata bProof
    ) external {
        euint64 encA = TFHE.asEuint64(a, aProof);
        euint64 encB = TFHE.asEuint64(b, bProof);
        lastComparisonResult = TFHE.gt(encA, encB);
        TFHE.allowThis(lastComparisonResult);
        TFHE.allow(lastComparisonResult, owner);
    }

    /**
     * @notice Checks if a is less than b
     */
    function isLessThan(
        einput a, bytes calldata aProof,
        einput b, bytes calldata bProof
    ) external {
        euint64 encA = TFHE.asEuint64(a, aProof);
        euint64 encB = TFHE.asEuint64(b, bProof);
        lastComparisonResult = TFHE.lt(encA, encB);
        TFHE.allowThis(lastComparisonResult);
        TFHE.allow(lastComparisonResult, owner);
    }

    /**
     * @notice Checks if a is greater than or equal to b
     */
    function isGreaterOrEqual(
        einput a, bytes calldata aProof,
        einput b, bytes calldata bProof
    ) external {
        euint64 encA = TFHE.asEuint64(a, aProof);
        euint64 encB = TFHE.asEuint64(b, bProof);
        lastComparisonResult = TFHE.ge(encA, encB);
        TFHE.allowThis(lastComparisonResult);
        TFHE.allow(lastComparisonResult, owner);
    }

    /**
     * @notice Checks if a is less than or equal to b
     */
    function isLessOrEqual(
        einput a, bytes calldata aProof,
        einput b, bytes calldata bProof
    ) external {
        euint64 encA = TFHE.asEuint64(a, aProof);
        euint64 encB = TFHE.asEuint64(b, bProof);
        lastComparisonResult = TFHE.le(encA, encB);
        TFHE.allowThis(lastComparisonResult);
        TFHE.allow(lastComparisonResult, owner);
    }

    function getLastResult() external view returns (ebool) {
        return lastComparisonResult;
    }
}`,
    test: `import { expect } from "chai";
import { ethers } from "hardhat";
import { createInstance } from "../instance";
import { getSigners, initSigners } from "../signers";

describe("EqualityComparison", function () {
  let contract: any;
  let fhevm: any;

  before(async function () {
    await initSigners();
    fhevm = await createInstance();
  });

  beforeEach(async function () {
    const signers = await getSigners();
    const Factory = await ethers.getContractFactory("EqualityComparison");
    contract = await Factory.connect(signers.alice).deploy();
    await contract.waitForDeployment();
  });

  it("should compare equal values correctly", async function () {
    const signers = await getSigners();
    const contractAddress = await contract.getAddress();

    const inputA = fhevm.createEncryptedInput(contractAddress, signers.alice.address);
    inputA.add64(42);
    const encA = await inputA.encrypt();

    const inputB = fhevm.createEncryptedInput(contractAddress, signers.alice.address);
    inputB.add64(42);
    const encB = await inputB.encrypt();

    const tx = await contract.isEqual(
      encA.handles[0], encA.inputProof,
      encB.handles[0], encB.inputProof
    );
    await tx.wait();
    // Result would be true
  });

  it("should compare greater than correctly", async function () {
    const signers = await getSigners();
    const contractAddress = await contract.getAddress();

    const inputA = fhevm.createEncryptedInput(contractAddress, signers.alice.address);
    inputA.add64(100);
    const encA = await inputA.encrypt();

    const inputB = fhevm.createEncryptedInput(contractAddress, signers.alice.address);
    inputB.add64(50);
    const encB = await inputB.encrypt();

    const tx = await contract.isGreaterThan(
      encA.handles[0], encA.inputProof,
      encB.handles[0], encB.inputProof
    );
    await tx.wait();
    // Result would be true (100 > 50)
  });

  it("should compare less than correctly", async function () {
    const signers = await getSigners();
    const contractAddress = await contract.getAddress();

    const inputA = fhevm.createEncryptedInput(contractAddress, signers.alice.address);
    inputA.add64(25);
    const encA = await inputA.encrypt();

    const inputB = fhevm.createEncryptedInput(contractAddress, signers.alice.address);
    inputB.add64(75);
    const encB = await inputB.encrypt();

    const tx = await contract.isLessThan(
      encA.handles[0], encA.inputProof,
      encB.handles[0], encB.inputProof
    );
    await tx.wait();
    // Result would be true (25 < 75)
  });
});`
  }
];

async function createAllExamples(): Promise<void> {
  console.log('\n🚀 Creating all FHEVM examples...\n');

  const baseTemplatePath = path.join(__dirname, '../../base-template');
  const examplesPath = path.join(__dirname, '../../examples');

  for (const example of EXAMPLES) {
    console.log(`Creating: ${example.name}...`);
    
    const examplePath = path.join(examplesPath, example.name);

    // Skip if already exists
    if (await fs.pathExists(examplePath)) {
      console.log(`  ⏭️  Skipped (already exists)`);
      continue;
    }

    // Copy base template
    await fs.copy(baseTemplatePath, examplePath);

    // Remove default contract files
    const contractsDir = path.join(examplePath, 'contracts');
    const existingContracts = await fs.readdir(contractsDir);
    for (const file of existingContracts) {
      if (file.endsWith('.sol')) {
        await fs.remove(path.join(contractsDir, file));
      }
    }

    // Write new contract
    await fs.writeFile(
      path.join(contractsDir, `${example.contractName}.sol`),
      example.contract
    );

    // Remove default test files
    const testsDir = path.join(examplePath, 'test');
    const existingTests = await fs.readdir(testsDir);
    for (const file of existingTests) {
      if (file.endsWith('.ts') && file !== 'instance.ts' && file !== 'signers.ts') {
        await fs.remove(path.join(testsDir, file));
      }
    }

    // Write new test
    await fs.writeFile(
      path.join(testsDir, `${example.contractName}.ts`),
      example.test
    );

    // Create metadata
    const metadata = {
      name: example.name,
      category: example.category,
      description: example.description,
      createdAt: new Date().toISOString()
    };
    await fs.writeFile(
      path.join(examplePath, 'example.json'),
      JSON.stringify(metadata, null, 2)
    );

    // Create README
    const readme = `# ${formatName(example.name)}

> Category: ${example.category}

${example.description}

## Quick Start

\`\`\`bash
npm install
npm run compile
npm run test
\`\`\`

## Contract

See \`contracts/${example.contractName}.sol\`

## Tests

See \`test/${example.contractName}.ts\`
`;
    await fs.writeFile(path.join(examplePath, 'README.md'), readme);

    console.log(`  ✅ Created successfully`);
  }

  console.log('\n✅ All examples created!\n');
}

function formatName(name: string): string {
  return name
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

createAllExamples().catch(console.error);