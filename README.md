# FHEVM Example Hub

A comprehensive collection of standalone FHEVM examples with automation tools and auto-generated documentation for the Zama Bounty Program.

## Features

- **Automation Tools** - TypeScript CLI scripts to scaffold new examples instantly
- **21 Standalone Examples** - One folder per concept, clean and minimal
- **Auto-Generated Docs** - GitBook-compatible documentation from code annotations
- **Maintenance Tools** - Update dependencies and validate all examples with one command
- **Comprehensive Tests** - Every example includes tests showing correct usage and anti-patterns

## Project Structure
```
fhevm-example-hub/
├── automation-tools/           # TypeScript CLI tools
│   ├── src/
│   │   ├── create-fhevm-example.ts    # Scaffold new examples
│   │   ├── generate-docs.ts           # Generate GitBook docs
│   │   ├── validate-all-examples.ts   # Validate all examples
│   │   └── update-dependencies.ts     # Update FHEVM versions
│   └── package.json
├── base-template/              # Hardhat template with @fhevm/solidity
├── examples/                   # 21 standalone example folders
├── docs/                       # Auto-generated GitBook documentation
└── scripts/                    # Utility scripts
```

## Examples Included (21 Total)

### Basic (3 examples)
| Example | Description |
|---------|-------------|
| simple-counter | Basic encrypted counter with increment/decrement |
| arithmetic-operations | FHE.add, FHE.sub, FHE.mul, FHE.div operations |
| equality-comparison | FHE.eq, FHE.ne, FHE.gt, FHE.lt, FHE.ge, FHE.le |

### Encryption (2 examples)
| Example | Description |
|---------|-------------|
| encrypt-single-value | Store a single encrypted value on-chain |
| encrypt-multiple-values | Handle multiple encrypted values in one transaction |

### Decryption (4 examples)
| Example | Description |
|---------|-------------|
| user-decrypt-single | User-initiated decryption of single value |
| user-decrypt-multiple | User-initiated decryption of multiple values |
| public-decrypt-single | Public decryption visible to everyone |
| public-decrypt-multiple | Public decryption of multiple values (election results) |

### Access Control (3 examples)
| Example | Description |
|---------|-------------|
| access-control-basics | TFHE.allow and TFHE.allowThis usage |
| access-control-transient | TFHE.allowTransient for temporary access |
| input-proofs-explained | Why input proofs are essential for security |

### Anti-Patterns (3 examples)
| Example | Description |
|---------|-------------|
| anti-pattern-view-functions | Why view functions cannot decrypt values |
| anti-pattern-missing-allow | Consequences of forgetting permissions |
| anti-pattern-common-mistakes | Collection of common FHEVM mistakes |

### Advanced (6 examples)
| Example | Description |
|---------|-------------|
| handle-lifecycle | How encrypted handles are created and managed |
| blind-auction | Auction with encrypted bids |
| confidential-voting | Voting system with encrypted votes |
| encrypted-lottery | Lottery with encrypted ticket numbers |
| erc7984-confidential-token | ERC7984 token with encrypted balances |
| confidential-vesting | Vesting wallet with encrypted amounts |

## Quick Start
```bash
# Clone the repository
git clone https://github.com/rudazy/fhevm-example-hub.git
cd fhevm-example-hub

# Install automation tools
cd automation-tools
npm install

# Validate all examples
npx ts-node src/validate-all-examples.ts

# Generate documentation
npx ts-node src/generate-docs.ts
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

# Categories: basic, encryption, decryption, access-control, anti-patterns, advanced
```

### generate-docs
Generates GitBook-compatible documentation from all examples.
```bash
npx ts-node src/generate-docs.ts
```

### validate-all-examples
Validates structure of all examples.
```bash
npx ts-node src/validate-all-examples.ts
```

### update-dependencies
Updates FHEVM dependencies across all examples.
```bash
npx ts-node src/update-dependencies.ts
npx ts-node src/update-dependencies.ts --dry-run  # Preview changes
```

## Adding New Examples

1. Use the CLI to scaffold:
```bash
   npx ts-node src/create-fhevm-example.ts create -n my-example -c basic -d "My description"
```

2. Edit the contract in `examples/my-example/contracts/`

3. Add tests in `examples/my-example/test/`

4. Regenerate docs:
```bash
   npx ts-node src/generate-docs.ts
```

5. Validate:
```bash
   npx ts-node src/validate-all-examples.ts
```

## Key FHEVM Concepts Covered

- **Encrypted Types**: euint8, euint16, euint32, euint64, ebool, eaddress
- **Arithmetic**: FHE.add, FHE.sub, FHE.mul, FHE.div
- **Comparison**: FHE.eq, FHE.ne, FHE.gt, FHE.lt, FHE.ge, FHE.le
- **Conditional**: FHE.select
- **Access Control**: TFHE.allow, TFHE.allowThis, TFHE.allowTransient
- **Input Handling**: einput, inputProof, TFHE.asEuint64
- **Decryption**: Gateway.requestDecryption, async callbacks
- **Handle Management**: TFHE.isInitialized, handle lifecycle

## Resources

- [Zama FHEVM Documentation](https://docs.zama.ai/fhevm)
- [FHEVM Hardhat Template](https://github.com/zama-ai/fhevm-hardhat-template)
- [OpenZeppelin Confidential Contracts](https://github.com/OpenZeppelin/openzeppelin-confidential-contracts)
- [Zama Discord](https://discord.gg/zama)

## License

MIT