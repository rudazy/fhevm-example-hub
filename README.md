# FHEVM Example Hub

A comprehensive collection of standalone FHEVM examples with automation tools, visual debugging, and auto-generated documentation.

## Features

- **Automation Tools** - CLI scripts to scaffold new examples instantly
- **Standalone Examples** - One repo per concept, clean and minimal
- **Visual Handle Debugger** - Understand FHE operations visually
- **Auto-Generated Docs** - GitBook-compatible documentation from code annotations
- **Maintenance Tools** - Update all examples when FHEVM changes

## Project Structure
```
fhevm-example-hub/
├── automation-tools/       # TypeScript CLI tools
├── base-template/          # Hardhat template with @fhevm/solidity
├── examples/               # Generated standalone example repos
├── docs/                   # Auto-generated GitBook documentation
└── scripts/                # Utility scripts
```

## Quick Start
```bash
# Install dependencies
cd automation-tools && npm install

# Create a new example
npx ts-node create-fhevm-example.ts --name "my-example"

# Generate documentation
npx ts-node generate-docs.ts

# Validate all examples
npx ts-node validate-all-examples.ts
```

## Examples Included

### Basic
- Simple FHE Counter
- Arithmetic Operations (add, sub)
- Equality Comparison

### Encryption
- Encrypt Single Value
- Encrypt Multiple Values

### Decryption
- User Decrypt Single Value
- User Decrypt Multiple Values
- Public Decrypt Single Value
- Public Decrypt Multiple Values

### Access Control
- FHE.allow and FHE.allowTransient
- Input Proofs Explained

### Anti-Patterns
- View Functions with Encrypted Values
- Missing FHE.allowThis() Permissions

### Advanced
- Handle Lifecycle
- ERC7984 Confidential Token
- Blind Auction
- Confidential Voting
- Encrypted Lottery

## License

MIT