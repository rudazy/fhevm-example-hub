import { expect } from "chai";
import { ethers } from "hardhat";
import { createInstance } from "../instance";
import { getSigners, initSigners } from "../signers";

/**
 * @title AntiPatternViewFunctions Tests
 * @notice Tests demonstrating the view function anti-pattern
 */
describe("AntiPatternViewFunctions", function () {
  let contract: any;
  let fhevm: any;

  before(async function () {
    await initSigners();
    fhevm = await createInstance();
  });

  beforeEach(async function () {
    const signers = await getSigners();
    const Factory = await ethers.getContractFactory("AntiPatternViewFunctions");
    contract = await Factory.connect(signers.alice).deploy();
    await contract.waitForDeployment();
  });

  describe("View Function Anti-Pattern", function () {
    /**
     * @notice Demonstrates correct approach - getting encrypted handle
     */
    it("CORRECT: should return encrypted handle from view function", async function () {
      const encryptedBalance = await contract.getEncryptedBalance();
      
      // This is a handle (reference), not the actual value
      // The handle is a bigint that references the encrypted data
      expect(typeof encryptedBalance).to.equal("bigint");
      expect(encryptedBalance).to.not.equal(0n);
      
      // To get the actual value, you would need to use Gateway decryption
      // which is an async process (not possible in a simple view call)
    });

    /**
     * @notice Demonstrates the anti-pattern result
     */
    it("ANTI-PATTERN: wrong approach returns handle ID, not actual value", async function () {
      const wrongValue = await contract.getBalanceWrongApproach();
      
      // This does NOT return 1000 (the actual balance)
      // It returns the handle ID which is just a reference number
      expect(wrongValue).to.not.equal(1000n);
      
      // The returned value is meaningless without proper decryption
      console.log("  [INFO] Wrong approach returned:", wrongValue.toString());
      console.log("  [INFO] This is the handle ID, NOT the balance of 1000");
    });

    /**
     * @notice Shows that encrypted values stay encrypted
     */
    it("should demonstrate that values remain encrypted", async function () {
      const signers = await getSigners();
      const contractAddress = await contract.getAddress();

      // Set a new balance
      const input = fhevm.createEncryptedInput(contractAddress, signers.alice.address);
      input.add64(5000);
      const encrypted = await input.encrypt();

      await (await contract.setBalance(
        encrypted.handles[0],
        encrypted.inputProof
      )).wait();

      // Get the "wrong" value
      const wrongValue = await contract.getBalanceWrongApproach();
      
      // Still not 5000
      expect(wrongValue).to.not.equal(5000n);
    });
  });
});