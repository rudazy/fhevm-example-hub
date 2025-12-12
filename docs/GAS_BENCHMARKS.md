# FHEVM Gas Benchmarks

Approximate gas costs for FHEVM operations.

> Note: Actual gas costs may vary based on network conditions and implementation.

## Operation Gas Estimates

### Arithmetic Operations

| Operation | Gas Estimate | Description |
|-----------|--------------|-------------|
| `TFHE.add(euint64, euint64)` | ~94,000 | Add two encrypted 64-bit values |
| `TFHE.sub(euint64, euint64)` | ~94,000 | Subtract two encrypted 64-bit values |
| `TFHE.mul(euint64, euint64)` | ~150,000 | Multiply two encrypted 64-bit values |
| `TFHE.div(euint64, euint64)` | ~350,000 | Divide two encrypted 64-bit values |
| `TFHE.rem(euint64, euint64)` | ~350,000 | Remainder of two encrypted 64-bit values |
| `TFHE.allow(euint64, address)` | ~25,000 | Allow address to access handle |
| `TFHE.allowTransient(euint64, address)` | ~2,500 | Temporary permission (current tx only) |

### Comparison Operations

| Operation | Gas Estimate | Description |
|-----------|--------------|-------------|
| `TFHE.eq(euint64, euint64)` | ~51,000 | Check equality of two encrypted values |
| `TFHE.ne(euint64, euint64)` | ~51,000 | Check inequality of two encrypted values |
| `TFHE.gt(euint64, euint64)` | ~51,000 | Greater than comparison |
| `TFHE.lt(euint64, euint64)` | ~51,000 | Less than comparison |
| `TFHE.ge(euint64, euint64)` | ~51,000 | Greater or equal comparison |
| `TFHE.le(euint64, euint64)` | ~51,000 | Less or equal comparison |

### Bitwise Operations

| Operation | Gas Estimate | Description |
|-----------|--------------|-------------|
| `TFHE.and(euint64, euint64)` | ~34,000 | Bitwise AND |
| `TFHE.or(euint64, euint64)` | ~34,000 | Bitwise OR |
| `TFHE.xor(euint64, euint64)` | ~34,000 | Bitwise XOR |
| `TFHE.not(euint64)` | ~33,000 | Bitwise NOT |
| `TFHE.shl(euint64, euint8)` | ~116,000 | Shift left |
| `TFHE.shr(euint64, euint8)` | ~116,000 | Shift right |

### Conditional Operations

| Operation | Gas Estimate | Description |
|-----------|--------------|-------------|
| `TFHE.select(ebool, euint64, euint64)` | ~45,000 | Conditional select |
| `TFHE.min(euint64, euint64)` | ~129,000 | Encrypted minimum |
| `TFHE.max(euint64, euint64)` | ~129,000 | Encrypted maximum |

### Type Conversions

| Operation | Gas Estimate | Description |
|-----------|--------------|-------------|
| `TFHE.asEuint64(einput, proof)` | ~150,000 | Convert encrypted input to euint64 |
| `TFHE.asEuint64(uint64)` | ~75,000 | Convert plaintext to euint64 |
| `TFHE.asEbool(bool)` | ~75,000 | Convert plaintext to ebool |

### Permission Operations

| Operation | Gas Estimate | Description |
|-----------|--------------|-------------|
| `TFHE.allowThis(euint64)` | ~25,000 | Allow contract to access handle |
| `TFHE.allow(euint64, address)` | ~25,000 | Allow address to access handle |
| `TFHE.allowTransient(euint64, address)` | ~2,500 | Temporary permission (current tx only) |

## Type Size Comparison

Smaller encrypted types use less gas:

| Type | Gas Multiplier |
|------|----------------|
| euint8 | 0.6x |
| euint16 | 0.7x |
| euint32 | 0.85x |
| euint64 | 1.0x (baseline) |
| euint128 | 1.3x |
| euint256 | 1.8x |

## Optimization Tips

1. **Use smaller types when possible** - euint8 uses ~60% of euint64 gas
2. **Batch operations** - Reduce permission overhead by grouping operations
3. **Use TFHE.allowTransient** - 10x cheaper than permanent permissions
4. **Minimize decryption requests** - Gateway calls are expensive
5. **Avoid division** - Use multiplication when mathematically equivalent
6. **Cache encrypted constants** - Store frequently used values
