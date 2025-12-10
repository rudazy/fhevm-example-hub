# Developer Guide

This guide explains how to add new examples, maintain existing ones, and use the automation tools.

## Table of Contents

1. [Adding New Examples](#adding-new-examples)
2. [Example Structure](#example-structure)
3. [Writing Contracts](#writing-contracts)
4. [Writing Tests](#writing-tests)
5. [Documentation](#documentation)
6. [Maintenance](#maintenance)
7. [Automation Tools Reference](#automation-tools-reference)

## Adding New Examples

### Using the CLI (Recommended)
```bash
cd automation-tools
npx ts-node src/create-fhevm-example.ts create -n example-name -c category -d "Description"
```

Or use the batch script:
```bash
scripts\create-example.bat example-name category "Description"
```

### Available Categories

- `basic` - Simple operations and concepts
- `encryption` - Encrypting values
- `decryption` - Decrypting values (user and public)
- `access-control` - Permissions and access management
- `anti-patterns` - Common mistakes to avoid
- `advanced` - Complex implementations

### Manual Creation

1. Copy the `base-template` folder to `examples/your-example-name`
2. Create `example.json` with metadata
3. Add your contract to `contracts/`
4. Add tests to `test/`
5. Update `README.md`

## Example Structure

Each example follows this structure:
```
examples/your-example/
├── contracts/
│   └── YourContract.sol      # Main contract
├── test/
│   ├── YourContract.ts       # Tests
│   ├── instance.ts           # FHEVM instance (from template)
│   └── signers.ts            # Test signers (from template)
├── example.json              # Metadata
├── README.md                 # Documentation
├── hardhat.config.ts         # Hardhat configuration
└── package.json              # Dependencies
```

### example.json Format
```json
{
  "name": "your-example",
  "category": "basic",
  "description": "Brief description of what this example demonstrates",
  "createdAt": "2025-12-07T00:00:00.000Z"
}
```

## Writing Contracts

### Required Imports
```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "fhevm/lib/TFHE.sol";
import "fhevm/config/ZamaFHEVMConfig.sol";
```

### For Decryption Examples
```solidity
import "fhevm/config/ZamaGatewayConfig.sol";
import "fhevm/gateway/GatewayCaller.sol";
```

### Contract Documentation

Use JSDoc-style comments for auto-documentation:
```solidity
/**
 * @title YourContractName
 * @author FHEVM Example Hub
 * @notice Brief description
 * @dev Detailed explanation of:
 *      - What this example demonstrates
 *      - Key concepts covered
 *      - Important considerations
 * 
 * @custom:category basic
 * @custom:difficulty beginner
 */
contract YourContract is SepoliaZamaFHEVMConfig {
    // ...
}
```

### Permission Pattern

Always follow this pattern when working with encrypted values:
```solidity
function storeValue(einput encValue, bytes calldata proof) external {
    euint64 value = TFHE.asEuint64(encValue, proof);
    
    // Store the value
    storedValue = value;
    
    // IMPORTANT: Set permissions
    TFHE.allowThis(storedValue);           // Allow contract to operate
    TFHE.allow(storedValue, msg.sender);   // Allow user to access
}
```

## Writing Tests

### Test Structure
```typescript
import { expect } from "chai";
import { ethers } from "hardhat";
import { createInstance } from "../instance";
import { getSigners, initSigners } from "../signers";

describe("YourContract", function () {
  let contract: any;
  let fhevm: any;

  before(async function () {
    await initSigners();
    fhevm = await createInstance();
  });

  beforeEach(async function () {
    const signers = await getSigners();
    const Factory = await ethers.getContractFactory("YourContract");
    contract = await Factory.connect(signers.alice).deploy();
    await contract.waitForDeployment();
  });

  describe("Feature Name", function () {
    it("should do something", async function () {
      // Test implementation
    });
  });
});
```

### Creating Encrypted Inputs
```typescript
const signers = await getSigners();
const contractAddress = await contract.getAddress();

const input = fhevm.createEncryptedInput(contractAddress, signers.alice.address);
input.add64(100);  // Add a 64-bit value
const encrypted = await input.encrypt();

// Use in contract call
await contract.someFunction(encrypted.handles[0], encrypted.inputProof);
```

### Testing Best Practices

1. Test the happy path (correct usage)
2. Test error cases (reverts)
3. Test access control
4. Add comments explaining what each test verifies

## Documentation

### Auto-Generation

Documentation is auto-generated from code annotations:
```bash
cd automation-tools
npx ts-node src/generate-docs.ts
```

Or use:
```bash
scripts\generate-docs.bat
```

### Documentation Tags

Use these tags in your contracts for better documentation:

- `@title` - Contract name
- `@author` - Author name
- `@notice` - Brief description
- `@dev` - Detailed explanation
- `@param` - Parameter description
- `@return` - Return value description
- `@custom:category` - Example category
- `@custom:difficulty` - beginner, intermediate, advanced

## Maintenance

### Validating All Examples
```bash
cd automation-tools
npx ts-node src/validate-all-examples.ts
```

Or use:
```bash
scripts\validate.bat
```

### Updating Dependencies

When FHEVM releases a new version:
```bash
cd automation-tools
npx ts-node src/update-dependencies.ts
```

Or use:
```bash
scripts\update-deps.bat
```

Then for each example:
```bash
cd examples/example-name
npm install
npm run compile
npm run test
```

## Automation Tools Reference

| Tool | Description | Command |
|------|-------------|---------|
| create-fhevm-example | Scaffold new example | `npx ts-node src/create-fhevm-example.ts create -n name -c category` |
| generate-docs | Generate GitBook docs | `npx ts-node src/generate-docs.ts` |
| validate-all-examples | Validate all examples | `npx ts-node src/validate-all-examples.ts` |
| update-dependencies | Update FHEVM versions | `npx ts-node src/update-dependencies.ts` |
| demo-runner | Run full demo | `npx ts-node src/demo-runner.ts` |

## Troubleshooting

### Common Issues

1. **Compilation fails**: Check Solidity version matches `^0.8.24`
2. **Tests fail**: Ensure `instance.ts` and `signers.ts` are present
3. **Validation fails**: Run the validator to see which files are missing
4. **Permission errors**: Always call `TFHE.allowThis()` after storing values

### Getting Help

- Check the [Zama Documentation](https://docs.zama.ai/fhevm)
- Review existing examples for patterns
- Join the [Zama Discord](https://discord.gg/zama)