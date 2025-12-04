import * as fs from 'fs-extra';
import * as path from 'path';

/**
 * @title Documentation Generator
 * @notice Generates GitBook-compatible documentation from examples
 * @dev Parses JSDoc comments and creates markdown files
 */

interface ExampleMetadata {
  name: string;
  category: string;
  description: string;
  createdAt: string;
}

interface ContractDoc {
  name: string;
  title: string;
  author: string;
  notice: string;
  dev: string;
  category: string;
  difficulty: string;
  functions: FunctionDoc[];
}

interface FunctionDoc {
  name: string;
  notice: string;
  dev: string;
  params: { name: string; description: string }[];
  returns: string;
}

const CATEGORY_ORDER = [
  'basic',
  'encryption',
  'decryption',
  'access-control',
  'anti-patterns',
  'advanced'
];

const CATEGORY_TITLES: Record<string, string> = {
  'basic': 'Basic Examples',
  'encryption': 'Encryption',
  'decryption': 'Decryption',
  'access-control': 'Access Control',
  'anti-patterns': 'Anti-Patterns',
  'advanced': 'Advanced Examples'
};

async function generateDocs(): Promise<void> {
  console.log('\n📚 Generating documentation...\n');

  const examplesPath = path.join(__dirname, '../../examples');
  const docsPath = path.join(__dirname, '../../docs');

  // Ensure docs directory exists
  await fs.ensureDir(docsPath);
  await fs.ensureDir(path.join(docsPath, 'examples'));

  // Get all examples
  const exampleDirs = await getExampleDirectories(examplesPath);
  
  if (exampleDirs.length === 0) {
    console.log('No examples found.');
    return;
  }

  // Group examples by category
  const categorizedExamples = await categorizeExamples(examplesPath, exampleDirs);

  // Generate main README
  await generateMainReadme(docsPath, categorizedExamples);

  // Generate SUMMARY.md for GitBook
  await generateSummary(docsPath, categorizedExamples);

  // Generate category pages
  for (const category of CATEGORY_ORDER) {
    if (categorizedExamples[category]?.length > 0) {
      await generateCategoryPage(docsPath, category, categorizedExamples[category], examplesPath);
    }
  }

  // Generate individual example pages
  for (const dir of exampleDirs) {
    await generateExamplePage(examplesPath, docsPath, dir);
  }

  console.log('\n✅ Documentation generated successfully!');
  console.log(`📁 Location: ${docsPath}\n`);
}

async function getExampleDirectories(examplesPath: string): Promise<string[]> {
  if (!await fs.pathExists(examplesPath)) {
    return [];
  }

  const entries = await fs.readdir(examplesPath);
  const dirs: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(examplesPath, entry);
    const stat = await fs.stat(fullPath);
    if (stat.isDirectory() && await fs.pathExists(path.join(fullPath, 'example.json'))) {
      dirs.push(entry);
    }
  }

  return dirs;
}

async function categorizeExamples(
  examplesPath: string,
  exampleDirs: string[]
): Promise<Record<string, string[]>> {
  const categorized: Record<string, string[]> = {};

  for (const dir of exampleDirs) {
    const metadataPath = path.join(examplesPath, dir, 'example.json');
    if (await fs.pathExists(metadataPath)) {
      const metadata: ExampleMetadata = await fs.readJson(metadataPath);
      const category = metadata.category || 'basic';
      
      if (!categorized[category]) {
        categorized[category] = [];
      }
      categorized[category].push(dir);
    }
  }

  return categorized;
}

async function generateMainReadme(
  docsPath: string,
  categorizedExamples: Record<string, string[]>
): Promise<void> {
  let content = `# FHEVM Example Hub

Welcome to the FHEVM Example Hub! This documentation provides comprehensive examples for building privacy-preserving smart contracts using Fully Homomorphic Encryption.

## What is FHEVM?

FHEVM (Fully Homomorphic Encryption Virtual Machine) allows you to perform computations on encrypted data directly on-chain. This means you can build smart contracts where sensitive data remains encrypted throughout its entire lifecycle.

## Examples Overview

`;

  for (const category of CATEGORY_ORDER) {
    const examples = categorizedExamples[category];
    if (examples?.length > 0) {
      content += `### ${CATEGORY_TITLES[category]}\n\n`;
      for (const example of examples) {
        const displayName = formatName(example);
        content += `- [${displayName}](examples/${category}/${example}.md)\n`;
      }
      content += '\n';
    }
  }

  content += `## Quick Start

\`\`\`bash
# Clone the repository
git clone https://github.com/rudazy/fhevm-example-hub.git
cd fhevm-example-hub

# Install automation tools
cd automation-tools && npm install

# Create a new example
npx ts-node src/create-fhevm-example.ts create -n my-example -c basic

# Generate documentation
npx ts-node src/generate-docs.ts
\`\`\`

## Resources

- [Zama Documentation](https://docs.zama.ai/protocol)
- [FHEVM Hardhat Template](https://github.com/zama-ai/fhevm-hardhat-template)
- [OpenZeppelin Confidential Contracts](https://github.com/OpenZeppelin/openzeppelin-confidential-contracts)
`;

  await fs.writeFile(path.join(docsPath, 'README.md'), content);
  console.log('  ✓ Generated README.md');
}

async function generateSummary(
  docsPath: string,
  categorizedExamples: Record<string, string[]>
): Promise<void> {
  let content = `# Summary

* [Introduction](README.md)

`;

  for (const category of CATEGORY_ORDER) {
    const examples = categorizedExamples[category];
    if (examples?.length > 0) {
      content += `## ${CATEGORY_TITLES[category]}\n\n`;
      for (const example of examples) {
        const displayName = formatName(example);
        content += `* [${displayName}](examples/${category}/${example}.md)\n`;
      }
      content += '\n';
    }
  }

  await fs.writeFile(path.join(docsPath, 'SUMMARY.md'), content);
  console.log('  ✓ Generated SUMMARY.md');
}

async function generateCategoryPage(
  docsPath: string,
  category: string,
  examples: string[],
  examplesPath: string
): Promise<void> {
  const categoryDir = path.join(docsPath, 'examples', category);
  await fs.ensureDir(categoryDir);

  let content = `# ${CATEGORY_TITLES[category]}

This section contains examples related to ${CATEGORY_TITLES[category].toLowerCase()}.

## Examples

`;

  for (const example of examples) {
    const metadataPath = path.join(examplesPath, example, 'example.json');
    let description = '';
    
    if (await fs.pathExists(metadataPath)) {
      const metadata: ExampleMetadata = await fs.readJson(metadataPath);
      description = metadata.description || '';
    }

    const displayName = formatName(example);
    content += `### [${displayName}](${example}.md)\n\n`;
    content += `${description}\n\n`;
  }

  await fs.writeFile(path.join(categoryDir, 'README.md'), content);
  console.log(`  ✓ Generated ${category}/README.md`);
}

async function generateExamplePage(
  examplesPath: string,
  docsPath: string,
  exampleDir: string
): Promise<void> {
  const examplePath = path.join(examplesPath, exampleDir);
  const metadataPath = path.join(examplePath, 'example.json');

  if (!await fs.pathExists(metadataPath)) {
    return;
  }

  const metadata: ExampleMetadata = await fs.readJson(metadataPath);
  const categoryDir = path.join(docsPath, 'examples', metadata.category);
  await fs.ensureDir(categoryDir);

  // Read contract file if exists
  const contractsDir = path.join(examplePath, 'contracts');
  let contractContent = '';
  let contractName = '';

  if (await fs.pathExists(contractsDir)) {
    const contracts = await fs.readdir(contractsDir);
    const solFiles = contracts.filter(f => f.endsWith('.sol'));
    
    if (solFiles.length > 0) {
      contractName = solFiles[0].replace('.sol', '');
      contractContent = await fs.readFile(
        path.join(contractsDir, solFiles[0]),
        'utf-8'
      );
    }
  }

  // Parse contract documentation
  const contractDoc = parseContractDoc(contractContent);

  let content = `# ${formatName(exampleDir)}

> **Category:** ${metadata.category}
> **Difficulty:** ${contractDoc.difficulty || 'beginner'}

${metadata.description || contractDoc.notice || ''}

## Overview

${contractDoc.dev || 'This example demonstrates FHEVM concepts.'}

## Contract: ${contractName || exampleDir}

\`\`\`solidity
${contractContent}
\`\`\`

## Key Concepts

`;

  // Extract key concepts from dev comments
  if (contractDoc.dev) {
    const concepts = contractDoc.dev.match(/- .+/g);
    if (concepts) {
      concepts.forEach(concept => {
        content += `${concept}\n`;
      });
    }
  }

  content += `
## How to Run

\`\`\`bash
cd examples/${exampleDir}
npm install
npm run compile
npm run test
\`\`\`

## Related Examples

- Check other examples in the ${CATEGORY_TITLES[metadata.category]} category

`;

  await fs.writeFile(path.join(categoryDir, `${exampleDir}.md`), content);
  console.log(`  ✓ Generated ${metadata.category}/${exampleDir}.md`);
}

function parseContractDoc(content: string): ContractDoc {
  const doc: ContractDoc = {
    name: '',
    title: '',
    author: '',
    notice: '',
    dev: '',
    category: 'basic',
    difficulty: 'beginner',
    functions: []
  };

  // Extract @title
  const titleMatch = content.match(/@title\s+(.+)/);
  if (titleMatch) doc.title = titleMatch[1].trim();

  // Extract @author
  const authorMatch = content.match(/@author\s+(.+)/);
  if (authorMatch) doc.author = authorMatch[1].trim();

  // Extract @notice
  const noticeMatch = content.match(/@notice\s+(.+)/);
  if (noticeMatch) doc.notice = noticeMatch[1].trim();

  // Extract @dev (can be multiline)
  const devMatch = content.match(/@dev\s+([\s\S]*?)(?=\n\s*\*\s*@|\n\s*\*\/)/);
  if (devMatch) doc.dev = devMatch[1].trim().replace(/\n\s*\*\s*/g, '\n');

  // Extract @custom:category
  const categoryMatch = content.match(/@custom:category\s+(.+)/);
  if (categoryMatch) doc.category = categoryMatch[1].trim();

  // Extract @custom:difficulty
  const difficultyMatch = content.match(/@custom:difficulty\s+(.+)/);
  if (difficultyMatch) doc.difficulty = difficultyMatch[1].trim();

  return doc;
}

function formatName(name: string): string {
  return name
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// Run the generator
generateDocs().catch(console.error);