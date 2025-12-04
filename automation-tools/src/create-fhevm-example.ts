import * as fs from 'fs-extra';
import * as path from 'path';
import { Command } from 'commander';

const program = new Command();

interface ExampleConfig {
  name: string;
  category: string;
  description: string;
  contract: string;
  test: string;
}

const CATEGORIES = [
  'basic',
  'encryption',
  'decryption',
  'access-control',
  'anti-patterns',
  'advanced'
];

program
  .name('create-fhevm-example')
  .description('CLI to scaffold FHEVM example projects')
  .version('1.0.0');

program
  .command('create')
  .description('Create a new FHEVM example')
  .requiredOption('-n, --name <name>', 'Example name (e.g., simple-counter)')
  .requiredOption('-c, --category <category>', `Category: ${CATEGORIES.join(', ')}`)
  .option('-d, --description <description>', 'Example description', '')
  .action(async (options) => {
    const { name, category, description } = options;
    
    if (!CATEGORIES.includes(category)) {
      console.error(`Invalid category. Choose from: ${CATEGORIES.join(', ')}`);
      process.exit(1);
    }

    console.log(`\nCreating FHEVM example: ${name}`);
    console.log(`Category: ${category}`);
    console.log(`Description: ${description}\n`);

    await createExample({ name, category, description, contract: '', test: '' });
  });

program
  .command('list')
  .description('List all available examples')
  .action(async () => {
    const examplesDir = path.join(__dirname, '../../examples');
    
    if (!fs.existsSync(examplesDir)) {
      console.log('No examples found.');
      return;
    }

    const examples = fs.readdirSync(examplesDir).filter(f => 
      fs.statSync(path.join(examplesDir, f)).isDirectory()
    );

    if (examples.length === 0) {
      console.log('No examples found.');
      return;
    }

    console.log('\nAvailable examples:\n');
    examples.forEach((example, index) => {
      console.log(`  ${index + 1}. ${example}`);
    });
    console.log('');
  });

async function createExample(config: ExampleConfig): Promise<void> {
  const baseTemplatePath = path.join(__dirname, '../../base-template');
  const examplesPath = path.join(__dirname, '../../examples');
  const examplePath = path.join(examplesPath, config.name);

  // Check if base template exists
  if (!fs.existsSync(baseTemplatePath)) {
    console.error('Base template not found. Please set up base-template first.');
    process.exit(1);
  }

  // Check if example already exists
  if (fs.existsSync(examplePath)) {
    console.error(`Example "${config.name}" already exists.`);
    process.exit(1);
  }

  // Copy base template to examples
  console.log('Copying base template...');
  await fs.copy(baseTemplatePath, examplePath);

  // Create example-specific README
  const readmeContent = generateReadme(config);
  await fs.writeFile(path.join(examplePath, 'README.md'), readmeContent);

  // Create metadata file
  const metadata = {
    name: config.name,
    category: config.category,
    description: config.description,
    createdAt: new Date().toISOString()
  };
  await fs.writeFile(
    path.join(examplePath, 'example.json'),
    JSON.stringify(metadata, null, 2)
  );

  console.log(`\nExample "${config.name}" created successfully!`);
  console.log(`Location: ${examplePath}\n`);
  console.log('Next steps:');
  console.log('  1. cd ' + examplePath);
  console.log('  2. npm install');
  console.log('  3. Add your contract to contracts/');
  console.log('  4. Add your tests to test/');
  console.log('');
}

function generateReadme(config: ExampleConfig): string {
  return `# ${formatName(config.name)}

> Category: ${config.category}

${config.description || 'A FHEVM example demonstrating ' + formatName(config.name).toLowerCase() + '.'}

## Overview

This example demonstrates how to use FHEVM for ${formatName(config.name).toLowerCase()}.

## Prerequisites

- Node.js >= 18
- npm or yarn
- Basic understanding of Solidity and FHE concepts

## Installation

\`\`\`bash
npm install
\`\`\`

## Usage

### Compile contracts

\`\`\`bash
npm run compile
\`\`\`

### Run tests

\`\`\`bash
npm run test
\`\`\`

## Contract Details

<!-- Contract explanation will be auto-generated -->

## Key Concepts

<!-- Key FHE concepts used in this example -->

## Common Pitfalls

<!-- Common mistakes to avoid -->

## Related Examples

<!-- Links to related examples -->

## License

MIT
`;
}

function formatName(name: string): string {
  return name
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

program.parse();