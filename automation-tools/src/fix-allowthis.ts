import * as fs from 'fs-extra';
import * as path from 'path';

async function fixAllowThis(): Promise<void> {
  console.log('\nFixing TFHE.allowThis() calls to TFHE.allow(x, address(this))...\n');

  const examplesPath = path.join(__dirname, '../../examples');
  const examples = await fs.readdir(examplesPath);

  let fixed = 0;

  for (const example of examples) {
    const contractsPath = path.join(examplesPath, example, 'contracts');
    
    if (!await fs.pathExists(contractsPath)) continue;

    const files = await fs.readdir(contractsPath);
    
    for (const file of files) {
      if (!file.endsWith('.sol')) continue;
      
      const filePath = path.join(contractsPath, file);
      let content = await fs.readFile(filePath, 'utf-8');
      
      const oldContent = content;
      
      // Replace TFHE.allowThis(x) with TFHE.allow(x, address(this))
      content = content.replace(/TFHE\.allowThis\(([^)]+)\)/g, 'TFHE.allow($1, address(this))');
      
      if (content !== oldContent) {
        await fs.writeFile(filePath, content);
        console.log(`  [OK] ${example}/contracts/${file}`);
        fixed++;
      }
    }
  }

  console.log(`\n[DONE] Fixed ${fixed} contract files\n`);
}

fixAllowThis().catch(console.error);