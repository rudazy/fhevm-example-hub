# FHEVM Example Hub

Welcome to the FHEVM Example Hub! This documentation provides comprehensive examples for building privacy-preserving smart contracts using Fully Homomorphic Encryption.

## What is FHEVM?

FHEVM (Fully Homomorphic Encryption Virtual Machine) allows you to perform computations on encrypted data directly on-chain. This means you can build smart contracts where sensitive data remains encrypted throughout its entire lifecycle.

## Examples Overview

### Basic Examples

- [Arithmetic Operations](examples/basic/arithmetic-operations.md)
- [Equality Comparison](examples/basic/equality-comparison.md)
- [Simple Counter](examples/basic/simple-counter.md)

### Encryption

- [Encrypt Multiple Values](examples/encryption/encrypt-multiple-values.md)
- [Encrypt Single Value](examples/encryption/encrypt-single-value.md)

### Decryption

- [Public Decrypt Multiple](examples/decryption/public-decrypt-multiple.md)
- [Public Decrypt Single](examples/decryption/public-decrypt-single.md)
- [User Decrypt Multiple](examples/decryption/user-decrypt-multiple.md)
- [User Decrypt Single](examples/decryption/user-decrypt-single.md)

### Access Control

- [Access Control Basics](examples/access-control/access-control-basics.md)
- [Access Control Transient](examples/access-control/access-control-transient.md)
- [Input Proofs Explained](examples/access-control/input-proofs-explained.md)

### Anti-Patterns

- [Anti Pattern Common Mistakes](examples/anti-patterns/anti-pattern-common-mistakes.md)
- [Anti Pattern Missing Allow](examples/anti-patterns/anti-pattern-missing-allow.md)
- [Anti Pattern View Functions](examples/anti-patterns/anti-pattern-view-functions.md)

### Advanced Examples

- [Blind Auction](examples/advanced/blind-auction.md)
- [Confidential Vesting](examples/advanced/confidential-vesting.md)
- [Confidential Voting](examples/advanced/confidential-voting.md)
- [Encrypted Lottery](examples/advanced/encrypted-lottery.md)
- [Erc7984 Confidential Token](examples/advanced/erc7984-confidential-token.md)
- [Handle Lifecycle](examples/advanced/handle-lifecycle.md)

## Quick Start

```bash
# Clone the repository
git clone https://github.com/rudazy/fhevm-example-hub.git
cd fhevm-example-hub

# Install automation tools
cd automation-tools && npm install

# Create a new example
npx ts-node src/create-fhevm-example.ts create -n my-example -c basic

# Generate documentation
npx ts-node src/generate-docs.ts
```

## Resources

- [Zama Documentation](https://docs.zama.ai/protocol)
- [FHEVM Hardhat Template](https://github.com/zama-ai/fhevm-hardhat-template)
- [OpenZeppelin Confidential Contracts](https://github.com/OpenZeppelin/openzeppelin-confidential-contracts)
