import { expect } from "chai";
import { ethers } from "hardhat";
import { createInstance } from "../instance";
import { getSigners, initSigners } from "../signers";

/**
 * @title AntiPatternMissingAllow Tests
 * @notice Tests demonstrating the missing permission anti-pattern
 */
describe("AntiPatternMissingAllow", function () {
  let contract: any;
  let fhevm: any;

  before(async function () {
    await initSigners();
    fhevm = await createInstance();
  });

  beforeEach(async function () {
    const signers = await getSigners();
    const Factory = await ethers.getContractFactory("AntiPatternMissingAllow");
    contract = await Factory.connect(signers.alice).deploy();
    await contract.waitForDeployment();
  });

  describe("Permission Anti-Patterns", function () {
    /**
     * @notice CORRECT: Properly permissioned storage works
     */
    it("CORRECT: should store and retrieve with proper permissions", async function () {
      const signers = await getSigners();
      const contractAddress = await contract.getAddress();

      const input = fhevm.createEncryptedInput(contractAddress, signers.alice.address);
      input.add64(100);
      const encrypted = await input.encrypt();

      await (await contract.storeCorrectly(
        encrypted.handles[0],
        encrypted.inputProof
      )).wait();

      const handle = await contract.getCorrect();
      expect(handle).to.not.equal(0n);
    });

    /**
     * @notice CORRECT: Operations work on properly permissioned values
     */
    it("CORRECT: should perform operations on properly permissioned value", async function () {
      const signers = await getSigners();
      const contractAddress = await contract.getAddress();

      // Store initial value
      const input1 = fhevm.createEncryptedInput(contractAddress, signers.alice.address);
      input1.add64(100);
      const enc1 = await input1.encrypt();
      await (await contract.storeCorrectly(enc1.handles[0], enc1.inputProof)).wait();

      // Add to it
      const input2 = fhevm.createEncryptedInput(contractAddress, signers.alice.address);
      input2.add64(50);
      const enc2 = await input2.encrypt();
      
      // This should work
      const tx = await contract.addToCorrect(enc2.handles[0], enc2.inputProof);
      await tx.wait();
      
      // Value is now 150 (encrypted)
    });

    /**
     * @notice ANTI-PATTERN: Missing allowThis causes issues
     */
    it("ANTI-PATTERN: should demonstrate missing allowThis issue", async function () {
      const signers = await getSigners();
      const contractAddress = await contract.getAddress();

      const input = fhevm.createEncryptedInput(contractAddress, signers.alice.address);
      input.add64(200);
      const encrypted = await input.encrypt();

      // This stores but without contract permission
      await (await contract.storeMissingAllowThis(
        encrypted.handles[0],
        encrypted.inputProof
      )).wait();

      console.log("  [INFO] Value stored but contract cannot operate on it");
      console.log("  [INFO] Future operations on this value may fail");
    });

    /**
     * @notice ANTI-PATTERN: Missing user allow causes access issues
     */
    it("ANTI-PATTERN: should demonstrate missing user allow issue", async function () {
      const signers = await getSigners();
      const contractAddress = await contract.getAddress();

      const input = fhevm.createEncryptedInput(contractAddress, signers.alice.address);
      input.add64(300);
      const encrypted = await input.encrypt();

      await (await contract.storeMissingUserAllow(
        encrypted.handles[0],
        encrypted.inputProof
      )).wait();

      console.log("  [INFO] Value stored but user cannot request re-encryption");
      console.log("  [INFO] User will not be able to decrypt this value");
    });
  });
});