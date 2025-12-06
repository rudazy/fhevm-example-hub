import { expect } from "chai";
import { ethers } from "hardhat";
import { createInstance } from "../instance";
import { getSigners, initSigners } from "../signers";

/**
 * @title AntiPatternCommonMistakes Tests
 * @notice Tests demonstrating common FHEVM mistakes
 */
describe("AntiPatternCommonMistakes", function () {
  let contract: any;
  let fhevm: any;

  before(async function () {
    await initSigners();
    fhevm = await createInstance();
  });

  beforeEach(async function () {
    const signers = await getSigners();
    const Factory = await ethers.getContractFactory("AntiPatternCommonMistakes");
    contract = await Factory.connect(signers.alice).deploy();
    await contract.waitForDeployment();
  });

  describe("Common Mistakes", function () {
    it("should demonstrate wrong comparison returns meaningless result", async function () {
      const signers = await getSigners();
      const contractAddress = await contract.getAddress();

      const input = fhevm.createEncryptedInput(contractAddress, signers.alice.address);
      input.add64(50);
      const encrypted = await input.encrypt();

      // This comparison is meaningless - comparing handle IDs
      const wrongResult = await contract.wrongComparison(
        encrypted.handles[0],
        encrypted.inputProof
      );

      console.log("  [INFO] Wrong comparison result:", wrongResult);
      console.log("  [INFO] This compares handle ID > 100, not actual value 50 > 100");
    });

    it("should demonstrate correct encrypted comparison", async function () {
      const signers = await getSigners();
      const contractAddress = await contract.getAddress();

      const input = fhevm.createEncryptedInput(contractAddress, signers.alice.address);
      input.add64(150);
      const encrypted = await input.encrypt();

      const tx = await contract.correctComparison(
        encrypted.handles[0],
        encrypted.inputProof
      );
      await tx.wait();

      // Returns ebool handle - would need decryption to see true/false
      console.log("  [INFO] Correct comparison returns encrypted boolean");
    });

    it("should demonstrate permission handling", async function () {
      const signers = await getSigners();
      const contractAddress = await contract.getAddress();

      const inputA = fhevm.createEncryptedInput(contractAddress, signers.alice.address);
      inputA.add64(10);
      const encA = await inputA.encrypt();

      const inputB = fhevm.createEncryptedInput(contractAddress, signers.alice.address);
      inputB.add64(20);
      const encB = await inputB.encrypt();

      // Correct way
      await (await contract.correctPermissionHandling(
        encA.handles[0], encA.inputProof,
        encB.handles[0], encB.inputProof
      )).wait();

      const value2 = await contract.getValue2();
      expect(value2).to.not.equal(0n);
    });

    it("should demonstrate access control importance", async function () {
      const signers = await getSigners();

      // Bob tries to access owner-only function
      await expect(
        contract.connect(signers.bob).correctWithAccessControl()
      ).to.be.revertedWith("Not authorized");
    });
  });
});