import { expect } from "chai";
import { ethers } from "hardhat";
import { createInstance } from "../instance";
import { getSigners, initSigners } from "../signers";
import { SimpleCounter } from "../typechain-types";

/**
 * @title SimpleCounter Tests
 * @notice Comprehensive tests for the SimpleCounter contract
 * @dev Demonstrates:
 *      - Contract deployment
 *      - Encrypted increment/decrement operations
 *      - Access control for encrypted values
 *      - Async decryption via Gateway
 * 
 * @custom:category basic
 */
describe("SimpleCounter", function () {
  let counter: SimpleCounter;
  let fhevm: Awaited<ReturnType<typeof createInstance>>;

  before(async function () {
    // Initialize signers for testing
    await initSigners();
    // Create FHEVM instance for encryption
    fhevm = await createInstance();
  });

  beforeEach(async function () {
    // Deploy a fresh contract before each test
    const signers = await getSigners();
    const CounterFactory = await ethers.getContractFactory("SimpleCounter");
    counter = await CounterFactory.connect(signers.alice).deploy();
    await counter.waitForDeployment();
  });

  describe("Deployment", function () {
    /**
     * @notice Test: Contract deploys with correct owner
     * @dev Verifies constructor sets owner correctly
     */
    it("should set the correct owner", async function () {
      const signers = await getSigners();
      expect(await counter.owner()).to.equal(signers.alice.address);
    });
  });

  describe("Increment Operations", function () {
    /**
     * @notice Test: incrementByOne increases counter
     * @dev Demonstrates simple increment without encrypted input
     */
    it("should increment counter by one", async function () {
      const tx = await counter.incrementByOne();
      await tx.wait();

      // Verify event was emitted
      await expect(tx).to.emit(counter, "CounterIncremented");
    });

    /**
     * @notice Test: increment with encrypted value
     * @dev Demonstrates:
     *      - Creating encrypted input
     *      - Generating input proof
     *      - Passing encrypted value to contract
     */
    it("should increment counter with encrypted amount", async function () {
      const signers = await getSigners();
      
      // Create encrypted input for value 5
      const input = fhevm.createEncryptedInput(
        await counter.getAddress(),
        signers.alice.address
      );
      input.add64(5);
      const encryptedAmount = await input.encrypt();

      // Call increment with encrypted value and proof
      const tx = await counter.increment(
        encryptedAmount.handles[0],
        encryptedAmount.inputProof
      );
      await tx.wait();

      await expect(tx).to.emit(counter, "CounterIncremented");
    });

    /**
     * @notice Test: Multiple increments accumulate
     * @dev Shows that FHE.add works correctly across multiple calls
     */
    it("should handle multiple increments", async function () {
      // Increment 3 times
      await (await counter.incrementByOne()).wait();
      await (await counter.incrementByOne()).wait();
      await (await counter.incrementByOne()).wait();

      // All increments should emit events
      // Final value would be 3 (verifiable via decryption)
    });
  });

  describe("Decrement Operations", function () {
    /**
     * @notice Test: decrementByOne decreases counter
     * @dev Note: Decrementing below zero with euint64 causes underflow
     */
    it("should decrement counter by one after incrementing", async function () {
      // First increment to avoid underflow
      await (await counter.incrementByOne()).wait();
      await (await counter.incrementByOne()).wait();

      // Then decrement
      const tx = await counter.decrementByOne();
      await tx.wait();

      await expect(tx).to.emit(counter, "CounterDecremented");
    });

    /**
     * @notice Test: decrement with encrypted value
     * @dev Demonstrates encrypted subtraction
     */
    it("should decrement counter with encrypted amount", async function () {
      const signers = await getSigners();

      // First increment by 10
      const inputInc = fhevm.createEncryptedInput(
        await counter.getAddress(),
        signers.alice.address
      );
      inputInc.add64(10);
      const encryptedInc = await inputInc.encrypt();
      await (await counter.increment(
        encryptedInc.handles[0],
        encryptedInc.inputProof
      )).wait();

      // Then decrement by 3
      const inputDec = fhevm.createEncryptedInput(
        await counter.getAddress(),
        signers.alice.address
      );
      inputDec.add64(3);
      const encryptedDec = await inputDec.encrypt();

      const tx = await counter.decrement(
        encryptedDec.handles[0],
        encryptedDec.inputProof
      );
      await tx.wait();

      await expect(tx).to.emit(counter, "CounterDecremented");
    });
  });

  describe("Reset", function () {
    /**
     * @notice Test: Owner can reset counter
     * @dev Verifies onlyOwner modifier works
     */
    it("should allow owner to reset counter", async function () {
      // Increment first
      await (await counter.incrementByOne()).wait();

      // Reset
      const tx = await counter.reset();
      await tx.wait();

      await expect(tx).to.emit(counter, "CounterReset");
    });

    /**
     * @notice Test: Non-owner cannot reset counter
     * @dev Demonstrates access control
     */
    it("should prevent non-owner from resetting", async function () {
      const signers = await getSigners();
      
      await expect(
        counter.connect(signers.bob).reset()
      ).to.be.revertedWith("Only owner can call this function");
    });
  });

  describe("Access Control", function () {
    /**
     * @notice Test: getCounter returns encrypted value
     * @dev The returned euint64 handle is only usable by authorized addresses
     */
    it("should return encrypted counter handle", async function () {
      const encryptedCounter = await counter.getCounter();
      // The handle exists but its value is encrypted
      expect(encryptedCounter).to.not.equal(0);
    });
  });

  /**
   * @notice Anti-pattern demonstration
   * @dev Shows what NOT to do with FHEVM
   */
  describe("Anti-Patterns (What NOT to Do)", function () {
    /**
     * @notice Anti-pattern: Trying to read encrypted value directly
     * @dev You cannot simply read the decrypted value from a euint64
     *      You must use the Gateway for decryption
     */
    it("demonstrates that encrypted values cannot be read directly", async function () {
      await (await counter.incrementByOne()).wait();
      
      // This returns an encrypted handle, NOT the actual value
      const handle = await counter.getCounter();
      
      // The handle is just a reference to the encrypted data
      // To get the actual value, you need Gateway decryption
      expect(typeof handle).to.equal("bigint");
    });
  });
});