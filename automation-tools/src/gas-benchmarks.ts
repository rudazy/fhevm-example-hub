import * as fs from 'fs-extra';
import * as path from 'path';

/**
 * @title Gas Benchmarks
 * @notice Reference gas costs for FHEVM operations
 * @dev These are approximate values based on Zama documentation
 */

interface GasBenchmark {
  operation: string;
  gasEstimate: string;
  description: string;
}

const benchmarks: GasBenchmark[] = [
  // Arithmetic Operations
  { operation: 'TFHE.add(euint64, euint64)', gasEstimate: '~94,000', description: 'Add two encrypted 64-bit values' },
  { operation: 'TFHE.sub(euint64, euint64)', gasEstimate: '~94,000', description: 'Subtract two encrypted 64-bit values' },
  { operation: 'TFHE.mul(euint64, euint64)', gasEstimate: '~150,000', description: 'Multiply two encrypted 64-bit values' },
  { operation: 'TFHE.div(euint64, euint64)', gasEstimate: '~350,000', description: 'Divide two encrypted 64-bit values' },
  { operation: 'TFHE.rem(euint64, euint64)', gasEstimate: '~350,000', description: 'Remainder of two encrypted 64-bit values' },

  // Comparison Operations
  { operation: 'TFHE.eq(euint64, euint64)', gasEstimate: '~51,000', description: 'Check equality of two encrypted values' },
  { operation: 'TFHE.ne(euint64, euint64)', gasEstimate: '~51,000', description: 'Check inequality of two encrypted values' },
  { operation: 'TFHE.gt(euint64, euint64)', gasEstimate: '~51,000', description: 'Greater than comparison' },
  { operation: 'TFHE.lt(euint64, euint64)', gasEstimate: '~51,000', description: 'Less than comparison' },
  { operation: 'TFHE.ge(euint64, euint64)', gasEstimate: '~51,000', description: 'Greater or equal comparison' },
  { operation: 'TFHE.le(euint64, euint64)', gasEstimate: '~51,000', description: 'Less or equal comparison' },

  // Bitwise Operations
  { operation: 'TFHE.and(euint64, euint64)', gasEstimate: '~34,000', description: 'Bitwise AND' },
  { operation: 'TFHE.or(euint64, euint64)', gasEstimate: '~34,000', description: 'Bitwise OR' },
  { operation: 'TFHE.xor(euint64, euint64)', gasEstimate: '~34,000', description: 'Bitwise XOR' },
  { operation: 'TFHE.not(euint64)', gasEstimate: '~33,000', description: 'Bitwise NOT' },
  { operation: 'TFHE.shl(euint64, euint8)', gasEstimate: '~116,000', description: 'Shift left' },
  { operation: 'TFHE.shr(euint64, euint8)', gasEstimate: '~116,000', description: 'Shift right' },

  // Conditional Operations
  { operation: 'TFHE.select(ebool, euint64, euint64)', gasEstimate: '~45,000', description: 'Conditional select' },
  { operation: 'TFHE.min(euint64, euint64)', gasEstimate: '~129,000', description: 'Encrypted minimum' },
  { operation: 'TFHE.max(euint64, euint64)', gasEstimate: '~129,000', description: 'Encrypted maximum' },

  // Type Conversions
  { operation: 'TFHE.asEuint64(einput, proof)', gasEstimate: '~150,000', description: 'Convert encrypted input to euint64' },
  { operation: 'TFHE.asEuint64(uint64)', gasEstimate: '~75,000', description: 'Convert plaintext to euint64' },
  { operation: 'TFHE.asEbool(bool)', gasEstimate: '~75,000', description: 'Convert plaintext to ebool' },

  // Permission Operations
  { operation: 'TFHE.allowThis(euint64)', gasEstimate: '~25,000', description: 'Allow contract to access handle' },
  { operation: 'TFHE.allow(euint64, address)', gasEstimate: '~25,000', description: 'Allow address to access handle' },
  { operation: 'TFHE.allowTransient(euint64, address)', gasEstimate: '~2,500', description: 'Temporary permission (current tx only)' },

  // Utility Operations
  { operation: 'TFHE.isInitialized(euint64)', gasEstimate: '~200', description: 'Check if handle is initialized' },
  { operation: 'Gateway.requestDecryption(...)', gasEstimate: '~100,000+', description: 'Request async decryption' },
];

const sizeComparison: { type: string; gasMultiplier: string }[] = [
  { type: 'euint8', gasMultiplier: '0.6x' },
  { type: 'euint16', gasMultiplier: '0.7x' },
  { type: 'euint32', gasMultiplier: '0.85x' },
  { type: 'euint64', gasMultiplier: '1.0x (baseline)' },
  { type: 'euint128', gasMultiplier: '1.3x' },
  { type: 'euint256', gasMultiplier: '1.8x' },
];

async function displayBenchmarks(): Promise<void> {
  console.log('');
  console.log('==============================================');
  console.log('   FHEVM Gas Benchmarks');
  console.log('==============================================');
  console.log('');
  console.log('Note: These are approximate values. Actual gas');
  console.log('costs may vary based on network conditions and');
  console.log('implementation details.');
  console.log('');
  console.log('----------------------------------------------');
  console.log('OPERATION GAS ESTIMATES (euint64 baseline)');
  console.log('----------------------------------------------');
  console.log('');

  // Group by category
  const categories: Record<string, GasBenchmark[]> = {
    'Arithmetic': benchmarks.filter(b => ['add', 'sub', 'mul', 'div', 'rem'].some(op => b.operation.includes(op))),
    'Comparison': benchmarks.filter(b => ['eq', 'ne', 'gt', 'lt', 'ge', 'le'].some(op => b.operation.includes(`.${op}(`))),
    'Bitwise': benchmarks.filter(b => ['and', 'or', 'xor', 'not', 'shl', 'shr'].some(op => b.operation.includes(op))),
    'Conditional': benchmarks.filter(b => ['select', 'min', 'max'].some(op => b.operation.includes(op))),
    'Type Conversion': benchmarks.filter(b => b.operation.includes('asE')),
    'Permissions': benchmarks.filter(b => b.operation.includes('allow')),
    'Utility': benchmarks.filter(b => b.operation.includes('isInitialized') || b.operation.includes('Gateway')),
  };

  for (const [category, ops] of Object.entries(categories)) {
    console.log(`[${category}]`);
    for (const op of ops) {
      const padding = ' '.repeat(Math.max(0, 45 - op.operation.length));
      console.log(`  ${op.operation}${padding}${op.gasEstimate}`);
    }
    console.log('');
  }

  console.log('----------------------------------------------');
  console.log('TYPE SIZE COMPARISON');
  console.log('----------------------------------------------');
  console.log('');
  console.log('Smaller types use less gas:');
  console.log('');
  for (const size of sizeComparison) {
    const padding = ' '.repeat(15 - size.type.length);
    console.log(`  ${size.type}${padding}${size.gasMultiplier}`);
  }

  console.log('');
  console.log('----------------------------------------------');
  console.log('OPTIMIZATION TIPS');
  console.log('----------------------------------------------');
  console.log('');
  console.log('1. Use smaller types when possible (euint8 vs euint64)');
  console.log('2. Batch operations to reduce permission overhead');
  console.log('3. Use TFHE.allowTransient for temporary access');
  console.log('4. Minimize decryption requests (expensive)');
  console.log('5. Avoid division when multiplication works');
  console.log('6. Cache encrypted constants');
  console.log('');
  console.log('==============================================');
  console.log('');

  // Also generate markdown file
  await generateMarkdown();
}

async function generateMarkdown(): Promise<void> {
  const docsPath = path.join(__dirname, '../../docs');
  await fs.ensureDir(docsPath);

  let md = `# FHEVM Gas Benchmarks

Approximate gas costs for FHEVM operations.

> Note: Actual gas costs may vary based on network conditions and implementation.

## Operation Gas Estimates

### Arithmetic Operations

| Operation | Gas Estimate | Description |
|-----------|--------------|-------------|
`;

  const arithmetic = benchmarks.filter(b => ['add', 'sub', 'mul', 'div', 'rem'].some(op => b.operation.includes(op)));
  for (const op of arithmetic) {
    md += `| \`${op.operation}\` | ${op.gasEstimate} | ${op.description} |\n`;
  }

  md += `
### Comparison Operations

| Operation | Gas Estimate | Description |
|-----------|--------------|-------------|
`;

  const comparison = benchmarks.filter(b => ['eq', 'ne', 'gt', 'lt', 'ge', 'le'].some(op => b.operation.includes(`.${op}(`)));
  for (const op of comparison) {
    md += `| \`${op.operation}\` | ${op.gasEstimate} | ${op.description} |\n`;
  }

  md += `
### Bitwise Operations

| Operation | Gas Estimate | Description |
|-----------|--------------|-------------|
`;

  const bitwise = benchmarks.filter(b => ['and', 'or', 'xor', 'not', 'shl', 'shr'].some(op => b.operation.includes(op)));
  for (const op of bitwise) {
    md += `| \`${op.operation}\` | ${op.gasEstimate} | ${op.description} |\n`;
  }

  md += `
### Conditional Operations

| Operation | Gas Estimate | Description |
|-----------|--------------|-------------|
`;

  const conditional = benchmarks.filter(b => ['select', 'min', 'max'].some(op => b.operation.includes(op)));
  for (const op of conditional) {
    md += `| \`${op.operation}\` | ${op.gasEstimate} | ${op.description} |\n`;
  }

  md += `
### Type Conversions

| Operation | Gas Estimate | Description |
|-----------|--------------|-------------|
`;

  const conversions = benchmarks.filter(b => b.operation.includes('asE'));
  for (const op of conversions) {
    md += `| \`${op.operation}\` | ${op.gasEstimate} | ${op.description} |\n`;
  }

  md += `
### Permission Operations

| Operation | Gas Estimate | Description |
|-----------|--------------|-------------|
`;

  const permissions = benchmarks.filter(b => b.operation.includes('allow'));
  for (const op of permissions) {
    md += `| \`${op.operation}\` | ${op.gasEstimate} | ${op.description} |\n`;
  }

  md += `
## Type Size Comparison

Smaller encrypted types use less gas:

| Type | Gas Multiplier |
|------|----------------|
`;

  for (const size of sizeComparison) {
    md += `| ${size.type} | ${size.gasMultiplier} |\n`;
  }

  md += `
## Optimization Tips

1. **Use smaller types when possible** - euint8 uses ~60% of euint64 gas
2. **Batch operations** - Reduce permission overhead by grouping operations
3. **Use TFHE.allowTransient** - 10x cheaper than permanent permissions
4. **Minimize decryption requests** - Gateway calls are expensive
5. **Avoid division** - Use multiplication when mathematically equivalent
6. **Cache encrypted constants** - Store frequently used values
`;

  await fs.writeFile(path.join(docsPath, 'GAS_BENCHMARKS.md'), md);
  console.log('Generated docs/GAS_BENCHMARKS.md');
}

displayBenchmarks().catch(console.error);