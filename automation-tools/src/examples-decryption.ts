import * as fs from 'fs-extra';
import * as path from 'path';

const EXAMPLES = [
  {
    name: 'user-decrypt-single',
    category: 'decryption',
    description: 'Demonstrates how a user can decrypt their own encrypted value',
    contractName: 'UserDecryptSingle',
    contract: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "fhevm/lib/TFHE.sol";
import "fhevm/config/ZamaFHEVMConfig.sol";
import "fhevm/config/ZamaGatewayConfig.sol";
import "fhevm/gateway/GatewayCaller.sol";

/**
 * @title UserDecryptSingle
 * @author FHEVM Example Hub
 * @notice Demonstrates user-initiated decryption of a single value
 * @dev This example shows how to:
 *      - Request decryption via Gateway
 *      - Handle async decryption callbacks
 *      - Emit decrypted values in events
 * 
 * @custom:category decryption
 * @custom:difficulty intermediate
 */
contract UserDecryptSingle is SepoliaZamaFHEVMConfig, SepoliaZamaGatewayConfig, GatewayCaller {
    
    mapping(address => euint64) private userBalances;
    mapping(uint256 => address) private requestToUser;
    
    event BalanceStored(address indexed user);
    event DecryptionRequested(address indexed user, uint256 requestId);
    event BalanceDecrypted(address indexed user, uint64 balance);

    /**
     * @notice Store an encrypted balance
     */
    function storeBalance(einput encryptedBalance, bytes calldata inputProof) external {
        euint64 balance = TFHE.asEuint64(encryptedBalance, inputProof);
        userBalances[msg.sender] = balance;
        TFHE.allowThis(balance);
        TFHE.allow(balance, msg.sender);
        emit BalanceStored(msg.sender);
    }

    /**
     * @notice Request decryption of your balance
     * @return requestId The ID to track the decryption request
     */
    function requestMyBalanceDecryption() external returns (uint256) {
        require(TFHE.isInitialized(userBalances[msg.sender]), "No balance stored");
        
        uint256[] memory cts = new uint256[](1);
        cts[0] = Gateway.toUint256(userBalances[msg.sender]);
        
        uint256 requestId = Gateway.requestDecryption(
            cts,
            this.decryptionCallback.selector,
            0,
            block.timestamp + 100,
            false
        );
        
        requestToUser[requestId] = msg.sender;
        emit DecryptionRequested(msg.sender, requestId);
        return requestId;
    }

    /**
     * @notice Callback function called by Gateway with decrypted value
     * @param requestId The original request ID
     * @param decryptedBalance The decrypted balance value
     */
    function decryptionCallback(uint256 requestId, uint64 decryptedBalance) external onlyGateway {
        address user = requestToUser[requestId];
        emit BalanceDecrypted(user, decryptedBalance);
        delete requestToUser[requestId];
    }

    /**
     * @notice Get encrypted balance handle
     */
    function getMyBalance() external view returns (euint64) {
        return userBalances[msg.sender];
    }
}`,
    test: `import { expect } from "chai";
import { ethers } from "hardhat";
import { createInstance } from "../instance";
import { getSigners, initSigners } from "../signers";

describe("UserDecryptSingle", function () {
  let contract: any;
  let fhevm: any;

  before(async function () {
    await initSigners();
    fhevm = await createInstance();
  });

  beforeEach(async function () {
    const signers = await getSigners();
    const Factory = await ethers.getContractFactory("UserDecryptSingle");
    contract = await Factory.connect(signers.alice).deploy();
    await contract.waitForDeployment();
  });

  describe("User Decryption Flow", function () {
    it("should store encrypted balance", async function () {
      const signers = await getSigners();
      const contractAddress = await contract.getAddress();

      const input = fhevm.createEncryptedInput(contractAddress, signers.alice.address);
      input.add64(1000);
      const encrypted = await input.encrypt();

      const tx = await contract.storeBalance(
        encrypted.handles[0],
        encrypted.inputProof
      );
      await tx.wait();

      await expect(tx).to.emit(contract, "BalanceStored");
    });

    it("should request decryption", async function () {
      const signers = await getSigners();
      const contractAddress = await contract.getAddress();

      // First store a balance
      const input = fhevm.createEncryptedInput(contractAddress, signers.alice.address);
      input.add64(5000);
      const encrypted = await input.encrypt();
      await (await contract.storeBalance(
        encrypted.handles[0],
        encrypted.inputProof
      )).wait();

      // Request decryption
      const tx = await contract.requestMyBalanceDecryption();
      await tx.wait();

      await expect(tx).to.emit(contract, "DecryptionRequested");
    });

    it("should fail decryption request without stored balance", async function () {
      await expect(
        contract.requestMyBalanceDecryption()
      ).to.be.revertedWith("No balance stored");
    });
  });
});`
  },
  {
    name: 'user-decrypt-multiple',
    category: 'decryption',
    description: 'Demonstrates decrypting multiple encrypted values in a single request',
    contractName: 'UserDecryptMultiple',
    contract: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "fhevm/lib/TFHE.sol";
import "fhevm/config/ZamaFHEVMConfig.sol";
import "fhevm/config/ZamaGatewayConfig.sol";
import "fhevm/gateway/GatewayCaller.sol";

/**
 * @title UserDecryptMultiple
 * @author FHEVM Example Hub
 * @notice Demonstrates decrypting multiple values at once
 * @dev This example shows how to:
 *      - Request decryption of multiple encrypted values
 *      - Handle multiple decrypted values in callback
 *      - Efficiently batch decryption requests
 * 
 * @custom:category decryption
 * @custom:difficulty intermediate
 */
contract UserDecryptMultiple is SepoliaZamaFHEVMConfig, SepoliaZamaGatewayConfig, GatewayCaller {
    
    struct EncryptedStats {
        euint64 health;
        euint64 attack;
        euint64 defense;
    }
    
    mapping(address => EncryptedStats) private userStats;
    mapping(uint256 => address) private requestToUser;
    
    event StatsStored(address indexed user);
    event DecryptionRequested(address indexed user, uint256 requestId);
    event StatsDecrypted(address indexed user, uint64 health, uint64 attack, uint64 defense);

    /**
     * @notice Store encrypted player stats
     */
    function storeStats(
        einput encHealth, bytes calldata proofHealth,
        einput encAttack, bytes calldata proofAttack,
        einput encDefense, bytes calldata proofDefense
    ) external {
        euint64 health = TFHE.asEuint64(encHealth, proofHealth);
        euint64 attack = TFHE.asEuint64(encAttack, proofAttack);
        euint64 defense = TFHE.asEuint64(encDefense, proofDefense);
        
        userStats[msg.sender] = EncryptedStats(health, attack, defense);
        
        TFHE.allowThis(health);
        TFHE.allowThis(attack);
        TFHE.allowThis(defense);
        TFHE.allow(health, msg.sender);
        TFHE.allow(attack, msg.sender);
        TFHE.allow(defense, msg.sender);
        
        emit StatsStored(msg.sender);
    }

    /**
     * @notice Request decryption of all stats at once
     */
    function requestStatsDecryption() external returns (uint256) {
        EncryptedStats storage stats = userStats[msg.sender];
        require(TFHE.isInitialized(stats.health), "No stats stored");
        
        // Request decryption of all three values at once
        uint256[] memory cts = new uint256[](3);
        cts[0] = Gateway.toUint256(stats.health);
        cts[1] = Gateway.toUint256(stats.attack);
        cts[2] = Gateway.toUint256(stats.defense);
        
        uint256 requestId = Gateway.requestDecryption(
            cts,
            this.decryptionCallback.selector,
            0,
            block.timestamp + 100,
            false
        );
        
        requestToUser[requestId] = msg.sender;
        emit DecryptionRequested(msg.sender, requestId);
        return requestId;
    }

    /**
     * @notice Callback with all decrypted values
     */
    function decryptionCallback(
        uint256 requestId,
        uint64 health,
        uint64 attack,
        uint64 defense
    ) external onlyGateway {
        address user = requestToUser[requestId];
        emit StatsDecrypted(user, health, attack, defense);
        delete requestToUser[requestId];
    }

    /**
     * @notice Get encrypted stats handles
     */
    function getMyStats() external view returns (euint64, euint64, euint64) {
        EncryptedStats storage stats = userStats[msg.sender];
        return (stats.health, stats.attack, stats.defense);
    }
}`,
    test: `import { expect } from "chai";
import { ethers } from "hardhat";
import { createInstance } from "../instance";
import { getSigners, initSigners } from "../signers";

describe("UserDecryptMultiple", function () {
  let contract: any;
  let fhevm: any;

  before(async function () {
    await initSigners();
    fhevm = await createInstance();
  });

  beforeEach(async function () {
    const signers = await getSigners();
    const Factory = await ethers.getContractFactory("UserDecryptMultiple");
    contract = await Factory.connect(signers.alice).deploy();
    await contract.waitForDeployment();
  });

  describe("Multiple Value Decryption", function () {
    it("should store multiple encrypted stats", async function () {
      const signers = await getSigners();
      const contractAddress = await contract.getAddress();

      const inputHealth = fhevm.createEncryptedInput(contractAddress, signers.alice.address);
      inputHealth.add64(100);
      const encHealth = await inputHealth.encrypt();

      const inputAttack = fhevm.createEncryptedInput(contractAddress, signers.alice.address);
      inputAttack.add64(50);
      const encAttack = await inputAttack.encrypt();

      const inputDefense = fhevm.createEncryptedInput(contractAddress, signers.alice.address);
      inputDefense.add64(30);
      const encDefense = await inputDefense.encrypt();

      const tx = await contract.storeStats(
        encHealth.handles[0], encHealth.inputProof,
        encAttack.handles[0], encAttack.inputProof,
        encDefense.handles[0], encDefense.inputProof
      );
      await tx.wait();

      await expect(tx).to.emit(contract, "StatsStored");
    });

    it("should request decryption of all stats", async function () {
      const signers = await getSigners();
      const contractAddress = await contract.getAddress();

      // Store stats first
      const inputHealth = fhevm.createEncryptedInput(contractAddress, signers.alice.address);
      inputHealth.add64(100);
      const encHealth = await inputHealth.encrypt();

      const inputAttack = fhevm.createEncryptedInput(contractAddress, signers.alice.address);
      inputAttack.add64(50);
      const encAttack = await inputAttack.encrypt();

      const inputDefense = fhevm.createEncryptedInput(contractAddress, signers.alice.address);
      inputDefense.add64(30);
      const encDefense = await inputDefense.encrypt();

      await (await contract.storeStats(
        encHealth.handles[0], encHealth.inputProof,
        encAttack.handles[0], encAttack.inputProof,
        encDefense.handles[0], encDefense.inputProof
      )).wait();

      // Request decryption
      const tx = await contract.requestStatsDecryption();
      await tx.wait();

      await expect(tx).to.emit(contract, "DecryptionRequested");
    });
  });
});`
  },
  {
    name: 'public-decrypt-single',
    category: 'decryption',
    description: 'Demonstrates public decryption where result is visible to everyone',
    contractName: 'PublicDecryptSingle',
    contract: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "fhevm/lib/TFHE.sol";
import "fhevm/config/ZamaFHEVMConfig.sol";
import "fhevm/config/ZamaGatewayConfig.sol";
import "fhevm/gateway/GatewayCaller.sol";

/**
 * @title PublicDecryptSingle
 * @author FHEVM Example Hub
 * @notice Demonstrates public decryption where anyone can see the result
 * @dev This example shows how to:
 *      - Perform public decryption (result stored on-chain)
 *      - Use decrypted values in contract logic
 *      - Handle the async nature of decryption
 * 
 * @custom:category decryption
 * @custom:difficulty intermediate
 */
contract PublicDecryptSingle is SepoliaZamaFHEVMConfig, SepoliaZamaGatewayConfig, GatewayCaller {
    
    euint64 private encryptedTotal;
    uint64 public decryptedTotal;
    bool public isDecrypted;
    address public owner;
    
    event ContributionAdded(address indexed contributor);
    event DecryptionRequested(uint256 requestId);
    event TotalRevealed(uint64 total);

    constructor() {
        owner = msg.sender;
        encryptedTotal = TFHE.asEuint64(0);
        TFHE.allowThis(encryptedTotal);
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    /**
     * @notice Add an encrypted contribution to the total
     */
    function addContribution(einput encryptedAmount, bytes calldata inputProof) external {
        euint64 amount = TFHE.asEuint64(encryptedAmount, inputProof);
        encryptedTotal = TFHE.add(encryptedTotal, amount);
        TFHE.allowThis(encryptedTotal);
        emit ContributionAdded(msg.sender);
    }

    /**
     * @notice Request public decryption of the total
     * @dev Once decrypted, the value is visible to everyone
     */
    function revealTotal() external onlyOwner returns (uint256) {
        require(!isDecrypted, "Already decrypted");
        
        uint256[] memory cts = new uint256[](1);
        cts[0] = Gateway.toUint256(encryptedTotal);
        
        uint256 requestId = Gateway.requestDecryption(
            cts,
            this.revealCallback.selector,
            0,
            block.timestamp + 100,
            false
        );
        
        emit DecryptionRequested(requestId);
        return requestId;
    }

    /**
     * @notice Callback that stores the decrypted value publicly
     */
    function revealCallback(uint256, uint64 total) external onlyGateway {
        decryptedTotal = total;
        isDecrypted = true;
        emit TotalRevealed(total);
    }

    /**
     * @notice Get the public total (only available after decryption)
     */
    function getTotal() external view returns (uint64) {
        require(isDecrypted, "Not yet decrypted");
        return decryptedTotal;
    }
}`,
    test: `import { expect } from "chai";
import { ethers } from "hardhat";
import { createInstance } from "../instance";
import { getSigners, initSigners } from "../signers";

describe("PublicDecryptSingle", function () {
  let contract: any;
  let fhevm: any;

  before(async function () {
    await initSigners();
    fhevm = await createInstance();
  });

  beforeEach(async function () {
    const signers = await getSigners();
    const Factory = await ethers.getContractFactory("PublicDecryptSingle");
    contract = await Factory.connect(signers.alice).deploy();
    await contract.waitForDeployment();
  });

  describe("Public Decryption", function () {
    it("should add encrypted contributions", async function () {
      const signers = await getSigners();
      const contractAddress = await contract.getAddress();

      const input = fhevm.createEncryptedInput(contractAddress, signers.alice.address);
      input.add64(100);
      const encrypted = await input.encrypt();

      const tx = await contract.addContribution(
        encrypted.handles[0],
        encrypted.inputProof
      );
      await tx.wait();

      await expect(tx).to.emit(contract, "ContributionAdded");
    });

    it("should request reveal of total", async function () {
      const signers = await getSigners();
      const contractAddress = await contract.getAddress();

      // Add some contributions
      const input = fhevm.createEncryptedInput(contractAddress, signers.alice.address);
      input.add64(500);
      const encrypted = await input.encrypt();
      await (await contract.addContribution(
        encrypted.handles[0],
        encrypted.inputProof
      )).wait();

      // Request reveal
      const tx = await contract.revealTotal();
      await tx.wait();

      await expect(tx).to.emit(contract, "DecryptionRequested");
    });

    it("should fail getTotal before decryption", async function () {
      await expect(contract.getTotal()).to.be.revertedWith("Not yet decrypted");
    });

    it("should only allow owner to reveal", async function () {
      const signers = await getSigners();

      await expect(
        contract.connect(signers.bob).revealTotal()
      ).to.be.revertedWith("Only owner");
    });
  });
});`
  },
  {
    name: 'public-decrypt-multiple',
    category: 'decryption',
    description: 'Demonstrates public decryption of multiple values simultaneously',
    contractName: 'PublicDecryptMultiple',
    contract: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "fhevm/lib/TFHE.sol";
import "fhevm/config/ZamaFHEVMConfig.sol";
import "fhevm/config/ZamaGatewayConfig.sol";
import "fhevm/gateway/GatewayCaller.sol";

/**
 * @title PublicDecryptMultiple
 * @author FHEVM Example Hub
 * @notice Demonstrates public decryption of multiple values
 * @dev This example shows how to:
 *      - Decrypt multiple values publicly at once
 *      - Store multiple decrypted results
 *      - Use case: revealing election results
 * 
 * @custom:category decryption
 * @custom:difficulty advanced
 */
contract PublicDecryptMultiple is SepoliaZamaFHEVMConfig, SepoliaZamaGatewayConfig, GatewayCaller {
    
    euint64 private encryptedVotesA;
    euint64 private encryptedVotesB;
    euint64 private encryptedVotesC;
    
    uint64 public votesA;
    uint64 public votesB;
    uint64 public votesC;
    bool public resultsRevealed;
    
    address public owner;
    
    event VoteCast(address indexed voter);
    event ResultsRequested(uint256 requestId);
    event ResultsRevealed(uint64 votesA, uint64 votesB, uint64 votesC);

    constructor() {
        owner = msg.sender;
        encryptedVotesA = TFHE.asEuint64(0);
        encryptedVotesB = TFHE.asEuint64(0);
        encryptedVotesC = TFHE.asEuint64(0);
        TFHE.allowThis(encryptedVotesA);
        TFHE.allowThis(encryptedVotesB);
        TFHE.allowThis(encryptedVotesC);
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    /**
     * @notice Cast an encrypted vote for a candidate
     * @param candidate 0=A, 1=B, 2=C (encrypted)
     */
    function vote(einput candidate, bytes calldata proof) external {
        euint64 choice = TFHE.asEuint64(candidate, proof);
        
        // Add 1 to the chosen candidate using select
        ebool isA = TFHE.eq(choice, TFHE.asEuint64(0));
        ebool isB = TFHE.eq(choice, TFHE.asEuint64(1));
        ebool isC = TFHE.eq(choice, TFHE.asEuint64(2));
        
        euint64 one = TFHE.asEuint64(1);
        euint64 zero = TFHE.asEuint64(0);
        
        encryptedVotesA = TFHE.add(encryptedVotesA, TFHE.select(isA, one, zero));
        encryptedVotesB = TFHE.add(encryptedVotesB, TFHE.select(isB, one, zero));
        encryptedVotesC = TFHE.add(encryptedVotesC, TFHE.select(isC, one, zero));
        
        TFHE.allowThis(encryptedVotesA);
        TFHE.allowThis(encryptedVotesB);
        TFHE.allowThis(encryptedVotesC);
        
        emit VoteCast(msg.sender);
    }

    /**
     * @notice Reveal all election results
     */
    function revealResults() external onlyOwner returns (uint256) {
        require(!resultsRevealed, "Already revealed");
        
        uint256[] memory cts = new uint256[](3);
        cts[0] = Gateway.toUint256(encryptedVotesA);
        cts[1] = Gateway.toUint256(encryptedVotesB);
        cts[2] = Gateway.toUint256(encryptedVotesC);
        
        uint256 requestId = Gateway.requestDecryption(
            cts,
            this.resultsCallback.selector,
            0,
            block.timestamp + 100,
            false
        );
        
        emit ResultsRequested(requestId);
        return requestId;
    }

    /**
     * @notice Callback with all vote counts
     */
    function resultsCallback(
        uint256,
        uint64 _votesA,
        uint64 _votesB,
        uint64 _votesC
    ) external onlyGateway {
        votesA = _votesA;
        votesB = _votesB;
        votesC = _votesC;
        resultsRevealed = true;
        emit ResultsRevealed(_votesA, _votesB, _votesC);
    }

    /**
     * @notice Get election results (only after reveal)
     */
    function getResults() external view returns (uint64, uint64, uint64) {
        require(resultsRevealed, "Results not revealed yet");
        return (votesA, votesB, votesC);
    }
}`,
    test: `import { expect } from "chai";
import { ethers } from "hardhat";
import { createInstance } from "../instance";
import { getSigners, initSigners } from "../signers";

describe("PublicDecryptMultiple", function () {
  let contract: any;
  let fhevm: any;

  before(async function () {
    await initSigners();
    fhevm = await createInstance();
  });

  beforeEach(async function () {
    const signers = await getSigners();
    const Factory = await ethers.getContractFactory("PublicDecryptMultiple");
    contract = await Factory.connect(signers.alice).deploy();
    await contract.waitForDeployment();
  });

  describe("Election System", function () {
    it("should cast encrypted votes", async function () {
      const signers = await getSigners();
      const contractAddress = await contract.getAddress();

      // Vote for candidate A (0)
      const input = fhevm.createEncryptedInput(contractAddress, signers.alice.address);
      input.add64(0);
      const encrypted = await input.encrypt();

      const tx = await contract.vote(
        encrypted.handles[0],
        encrypted.inputProof
      );
      await tx.wait();

      await expect(tx).to.emit(contract, "VoteCast");
    });

    it("should cast multiple votes from different users", async function () {
      const signers = await getSigners();
      const contractAddress = await contract.getAddress();

      // Alice votes for A
      const inputAlice = fhevm.createEncryptedInput(contractAddress, signers.alice.address);
      inputAlice.add64(0);
      const encAlice = await inputAlice.encrypt();
      await (await contract.vote(encAlice.handles[0], encAlice.inputProof)).wait();

      // Bob votes for B
      const inputBob = fhevm.createEncryptedInput(contractAddress, signers.bob.address);
      inputBob.add64(1);
      const encBob = await inputBob.encrypt();
      await (await contract.connect(signers.bob).vote(encBob.handles[0], encBob.inputProof)).wait();
    });

    it("should request results reveal", async function () {
      const signers = await getSigners();
      const contractAddress = await contract.getAddress();

      // Cast a vote first
      const input = fhevm.createEncryptedInput(contractAddress, signers.alice.address);
      input.add64(2); // Vote for C
      const encrypted = await input.encrypt();
      await (await contract.vote(encrypted.handles[0], encrypted.inputProof)).wait();

      // Request reveal
      const tx = await contract.revealResults();
      await tx.wait();

      await expect(tx).to.emit(contract, "ResultsRequested");
    });

    it("should fail getResults before reveal", async function () {
      await expect(contract.getResults()).to.be.revertedWith("Results not revealed yet");
    });
  });
});`
  }
];

async function createExamples(): Promise<void> {
  console.log('\n🔓 Creating decryption examples...\n');

  const baseTemplatePath = path.join(__dirname, '../../base-template');
  const examplesPath = path.join(__dirname, '../../examples');

  for (const example of EXAMPLES) {
    console.log(`Creating: ${example.name}...`);
    
    const examplePath = path.join(examplesPath, example.name);

    if (await fs.pathExists(examplePath)) {
      console.log(`  ⏭️  Skipped (already exists)`);
      continue;
    }

    await fs.copy(baseTemplatePath, examplePath);

    const contractsDir = path.join(examplePath, 'contracts');
    const existingContracts = await fs.readdir(contractsDir);
    for (const file of existingContracts) {
      if (file.endsWith('.sol')) {
        await fs.remove(path.join(contractsDir, file));
      }
    }

    await fs.writeFile(
      path.join(contractsDir, `${example.contractName}.sol`),
      example.contract
    );

    const testsDir = path.join(examplePath, 'test');
    const existingTests = await fs.readdir(testsDir);
    for (const file of existingTests) {
      if (file.endsWith('.ts') && !['instance.ts', 'signers.ts'].includes(file)) {
        await fs.remove(path.join(testsDir, file));
      }
    }

    await fs.writeFile(
      path.join(testsDir, `${example.contractName}.ts`),
      example.test
    );

    await fs.writeFile(
      path.join(examplePath, 'example.json'),
      JSON.stringify({
        name: example.name,
        category: example.category,
        description: example.description,
        createdAt: new Date().toISOString()
      }, null, 2)
    );

    await fs.writeFile(
      path.join(examplePath, 'README.md'),
      `# ${example.name.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}\n\n> Category: ${example.category}\n\n${example.description}\n\n## Quick Start\n\n\`\`\`bash\nnpm install\nnpm run compile\nnpm run test\n\`\`\`\n`
    );

    console.log(`  ✅ Created successfully`);
  }

  console.log('\n✅ Decryption examples created!\n');
}

createExamples().catch(console.error);