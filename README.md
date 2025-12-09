# FHEVM Example Hub

A comprehensive collection of standalone FHEVM examples with automation tools and auto-generated documentation for the Zama Bounty Program.

## Features

- **Automation Tools** - TypeScript CLI scripts to scaffold new examples instantly
- **20+ Standalone Examples** - One folder per concept, clean and minimal
- **Auto-Generated Docs** - GitBook-compatible documentation from code annotations
- **Comprehensive Tests** - Every example includes tests showing correct usage and anti-patterns

## Project Structure
```
fhevm-example-hub/
├── automation-tools/       # TypeScript CLI tools
│   ├── src/
│   │   ├── create-fhevm-example.ts
│   │   ├── generate-docs.ts
│   │   └── examples-*.ts
│   └── package.json
├── base-template/          # Hardhat template with @fhevm/solidity
├── examples/               # Generated standalone example folders
│   ├── simple-counter/
│   ├── arithmetic-operations/
│   ├── blind-auction/
│   └── ...
├── docs/                   # Auto-generated GitBook documentation
└── scripts/                # Utility scripts
```

## Examples Included

### Basic
- Simple FHE Counter
- Arithmetic Operations (add, sub, mul, div)
- Equality Comparison (eq, ne, gt, lt, ge, le)

### Encryption
- Encrypt Single Value
- Encrypt Multiple Values

### Decryption
- User Decrypt Single Value
- User Decrypt Multiple Values
- Public Decrypt Single Value
- Public Decrypt Multiple Values

### Access Control
- Access Control Basics (FHE.allow, FHE.allowThis)
- Access Control Transient (FHE.allowTransient)
- Input Proofs Explained

### Anti-Patterns
- View Functions with Encrypted Values
- Missing FHE.allowThis() Permissions
- Common Mistakes Collection

### Advanced
- Handle Lifecycle
- Blind Auction
- Confidential Voting
- Encrypted Lottery

## Quick Start
```bash
# Clone the repository
git clone https://github.com/rudazy/fhevm-example-hub.git
cd fhevm-example-hub

# Install automation tools
cd automation-tools
npm install

# Create a new example
npx ts-node src/create-fhevm-example.ts create -n my-example -c basic

# Generate documentation
npx ts-node src/generate-docs.ts

# List all examples
npx ts-node src/create-fhevm-example.ts list
```

## Running an Example
```bash
cd examples/simple-counter
npm install
npm run compile
npm run test
```

## Automation Tools

### create-fhevm-example
Scaffolds new FHEVM example projects from the base template.
```bash
npx ts-node src/create-fhevm-example.ts create -n example-name -c category -d "Description"
```

Categories: basic, encryption, decryption, access-control, anti-patterns, advanced

### generate-docs
Generates GitBook-compatible documentation from all examples.
```bash
npx ts-node src/generate-docs.ts
```

## Resources

- [Zama FHEVM Documentation](https://docs.zama.ai/fhevm)
- [FHEVM Hardhat Template](https://github.com/zama-ai/fhevm-hardhat-template)
- [OpenZeppelin Confidential Contracts](https://github.com/OpenZeppelin/openzeppelin-confidential-contracts)

## License

MIT