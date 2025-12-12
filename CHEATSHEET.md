# FHEVM Cheat Sheet

Quick reference for FHEVM development.

---

## Encrypted Types

| Type | Description | Range |
|------|-------------|-------|
| `ebool` | Encrypted boolean | true/false |
| `euint8` | Encrypted 8-bit unsigned | 0 to 255 |
| `euint16` | Encrypted 16-bit unsigned | 0 to 65,535 |
| `euint32` | Encrypted 32-bit unsigned | 0 to 4,294,967,295 |
| `euint64` | Encrypted 64-bit unsigned | 0 to 18,446,744,073,709,551,615 |
| `eaddress` | Encrypted address | 20 bytes |

---

## Required Imports
```solidity
// Basic FHEVM
import "fhevm/lib/TFHE.sol";
import "fhevm/config/ZamaFHEVMConfig.sol";

// For decryption
import "fhevm/config/ZamaGatewayConfig.sol";
import "fhevm/gateway/GatewayCaller.sol";
```

---

## Contract Setup
```solidity
// Basic contract
contract MyContract is SepoliaZamaFHEVMConfig {
    // ...
}

// With decryption
contract MyContract is SepoliaZamaFHEVMConfig, SepoliaZamaGatewayConfig, GatewayCaller {
    // ...
}
```

---

## Creating Encrypted Values
```solidity
// From plaintext
euint64 value = TFHE.asEuint64(100);
ebool flag = TFHE.asEbool(true);

// From encrypted input
function store(einput encValue, bytes calldata proof) external {
    euint64 value = TFHE.asEuint64(encValue, proof);
}
```

---

## Arithmetic Operations

| Operation | Syntax | Description |
|-----------|--------|-------------|
| Add | `TFHE.add(a, b)` | a + b |
| Subtract | `TFHE.sub(a, b)` | a - b |
| Multiply | `TFHE.mul(a, b)` | a * b |
| Divide | `TFHE.div(a, b)` | a / b |
| Remainder | `TFHE.rem(a, b)` | a % b |
| Min | `TFHE.min(a, b)` | minimum of a, b |
| Max | `TFHE.max(a, b)` | maximum of a, b |
| Negate | `TFHE.neg(a)` | -a |

---

## Comparison Operations

| Operation | Syntax | Returns |
|-----------|--------|---------|
| Equal | `TFHE.eq(a, b)` | ebool |
| Not Equal | `TFHE.ne(a, b)` | ebool |
| Greater Than | `TFHE.gt(a, b)` | ebool |
| Greater or Equal | `TFHE.ge(a, b)` | ebool |
| Less Than | `TFHE.lt(a, b)` | ebool |
| Less or Equal | `TFHE.le(a, b)` | ebool |

---

## Bitwise Operations

| Operation | Syntax |
|-----------|--------|
| AND | `TFHE.and(a, b)` |
| OR | `TFHE.or(a, b)` |
| XOR | `TFHE.xor(a, b)` |
| NOT | `TFHE.not(a)` |
| Shift Left | `TFHE.shl(a, b)` |
| Shift Right | `TFHE.shr(a, b)` |

---

## Conditional Selection
```solidity
// Select based on encrypted condition
euint64 result = TFHE.select(condition, valueIfTrue, valueIfFalse);

// Example
ebool isHigher = TFHE.gt(bid, currentBid);
currentBid = TFHE.select(isHigher, bid, currentBid);
```

---

## Permission Management
```solidity
// ALWAYS do this after creating/modifying encrypted values:

// Allow contract to operate on value
TFHE.allowThis(encryptedValue);

// Allow specific address to access value
TFHE.allow(encryptedValue, userAddress);

// Temporary access (current transaction only)
TFHE.allowTransient(encryptedValue, userAddress);
```

---

## Decryption (Gateway)
```solidity
// Request decryption
function requestDecrypt() external returns (uint256) {
    uint256[] memory cts = new uint256[](1);
    cts[0] = Gateway.toUint256(encryptedValue);
    
    uint256 requestId = Gateway.requestDecryption(
        cts,
        this.decryptCallback.selector,
        0,                          // metadata
        block.timestamp + 100,      // deadline
        false                       // trustless
    );
    return requestId;
}

// Callback function
function decryptCallback(uint256 requestId, uint64 value) external onlyGateway {
    // Handle decrypted value
}
```

---

## Common Patterns

### Store with Permissions
```solidity
function store(einput encValue, bytes calldata proof) external {
    euint64 value = TFHE.asEuint64(encValue, proof);
    storedValue = value;
    TFHE.allowThis(storedValue);
    TFHE.allow(storedValue, msg.sender);
}
```

### Transfer Pattern
```solidity
function transfer(address to, einput amount, bytes calldata proof) external {
    euint64 transferAmount = TFHE.asEuint64(amount, proof);
    
    balances[msg.sender] = TFHE.sub(balances[msg.sender], transferAmount);
    balances[to] = TFHE.add(balances[to], transferAmount);
    
    TFHE.allowThis(balances[msg.sender]);
    TFHE.allow(balances[msg.sender], msg.sender);
    TFHE.allowThis(balances[to]);
    TFHE.allow(balances[to], to);
}
```

### Conditional Update
```solidity
function updateIfHigher(einput newValue, bytes calldata proof) external {
    euint64 value = TFHE.asEuint64(newValue, proof);
    ebool isHigher = TFHE.gt(value, currentValue);
    currentValue = TFHE.select(isHigher, value, currentValue);
    TFHE.allowThis(currentValue);
}
```

---

## Anti-Patterns (Avoid These)
```solidity
// WRONG: View function cannot decrypt
function getBalance() external view returns (uint64) {
    return uint64(euint64.unwrap(balance)); // Returns handle, not value!
}

// WRONG: Missing permissions
function store(einput val, bytes calldata proof) external {
    storedValue = TFHE.asEuint64(val, proof);
    // Missing TFHE.allowThis() and TFHE.allow()!
}

// WRONG: Direct comparison
if (euint64.unwrap(a) > euint64.unwrap(b)) { } // Compares handles, not values!

// CORRECT: Use FHE comparison
ebool result = TFHE.gt(a, b);
```

---

## Test Pattern (TypeScript)
```typescript
import { createInstance } from "../instance";
import { getSigners, initSigners } from "../signers";

describe("MyContract", function () {
  let contract: any;
  let fhevm: any;

  before(async function () {
    await initSigners();
    fhevm = await createInstance();
  });

  it("should store encrypted value", async function () {
    const signers = await getSigners();
    const contractAddress = await contract.getAddress();

    // Create encrypted input
    const input = fhevm.createEncryptedInput(contractAddress, signers.alice.address);
    input.add64(100);
    const encrypted = await input.encrypt();

    // Call contract
    await contract.store(encrypted.handles[0], encrypted.inputProof);
  });
});
```

---

## Quick Reference

| Task | Code |
|------|------|
| Create encrypted 0 | `TFHE.asEuint64(0)` |
| Check if initialized | `TFHE.isInitialized(value)` |
| Allow contract | `TFHE.allowThis(value)` |
| Allow user | `TFHE.allow(value, addr)` |
| Convert for Gateway | `Gateway.toUint256(value)` |

---

## Resources

- [Zama Documentation](https://docs.zama.ai/fhevm)
- [FHEVM Hardhat Template](https://github.com/zama-ai/fhevm-hardhat-template)
- [OpenZeppelin Confidential Contracts](https://github.com/OpenZeppelin/openzeppelin-confidential-contracts)