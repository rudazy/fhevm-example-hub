# Contributing to FHEVM Example Hub

Thank you for your interest in contributing to the FHEVM Example Hub.

## How to Contribute

### Adding New Examples

1. Fork the repository
2. Create a new branch: `git checkout -b add-example-name`
3. Use the CLI to scaffold your example:
```bash
   cd automation-tools
   npx ts-node src/create-fhevm-example.ts create -n your-example -c category -d "Description"
```
4. Implement your contract in `examples/your-example/contracts/`
5. Add comprehensive tests in `examples/your-example/test/`
6. Run validation: `npx ts-node src/validate-all-examples.ts`
7. Generate docs: `npx ts-node src/generate-docs.ts`
8. Commit your changes
9. Submit a pull request

### Example Quality Standards

All examples must:

- Have a clear, single focus
- Include comprehensive JSDoc comments
- Have working tests
- Follow the permission pattern (TFHE.allowThis, TFHE.allow)
- Include both positive and negative test cases
- Have a descriptive README.md

### Code Style

- Use TypeScript for all automation tools
- Use Solidity ^0.8.24 for contracts
- Follow existing code formatting
- No emojis in code or output
- Professional, clean output messages

### Commit Messages

Use clear, descriptive commit messages:

- `Add example: confidential-nft`
- `Fix: missing permission in blind-auction`
- `Update: regenerate documentation`
- `Improve: validation tool error handling`

### Pull Request Process

1. Ensure all validation passes
2. Update documentation if needed
3. Describe your changes clearly
4. Link any related issues

## Reporting Issues

When reporting issues, include:

- Clear description of the problem
- Steps to reproduce
- Expected vs actual behavior
- Your environment (OS, Node version)

## Questions

For questions about FHEVM concepts, refer to:

- [Zama Documentation](https://docs.zama.ai/fhevm)
- [Zama Discord](https://discord.gg/zama)