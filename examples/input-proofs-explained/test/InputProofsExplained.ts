import { expect } from "chai";
import { ethers } from "hardhat";
import { createInstance } from "../instance";
import { getSigners, initSigners } from "../signers";

describe("InputProofsExplained", function () {
  let contract: any;
  let fhevm: any;

  before(async function () {
    await initSigners();
    fhevm = await createInstance();
  });

  beforeEach(async function () {
    const signers = await getSigners();
    const Factory = await ethers.getContractFactory("InputProofsExplained");
    contract = await Factory.connect(signers.alice).deploy();
    await contract.waitForDeployment();
  });

  describe("Input Proof Verification", function () {
    it("should accept valid input proof", async function () {
      const signers = await getSigners();
      const contractAddress = await contract.getAddress();

      const input = fhevm.createEncryptedInput(contractAddress, signers.alice.address);
      input.add64(500);
      const encrypted = await input.encrypt();

      const tx = await contract.deposit(encrypted.handles[0], encrypted.inputProof);
      await tx.wait();

      await expect(tx).to.emit(contract, "DepositMade");
      expect(await contract.hasDeposit()).to.equal(true);
    });

    it("should track total depositors", async function () {
      const signers = await getSigners();
      const contractAddress = await contract.getAddress();

      expect(await contract.totalDepositors()).to.equal(0);

      const inputAlice = fhevm.createEncryptedInput(contractAddress, signers.alice.address);
      inputAlice.add64(100);
      const encAlice = await inputAlice.encrypt();
      await (await contract.deposit(encAlice.handles[0], encAlice.inputProof)).wait();

      expect(await contract.totalDepositors()).to.equal(1);

      const inputBob = fhevm.createEncryptedInput(contractAddress, signers.bob.address);
      inputBob.add64(200);
      const encBob = await inputBob.encrypt();
      await (await contract.connect(signers.bob).deposit(encBob.handles[0], encBob.inputProof)).wait();

      expect(await contract.totalDepositors()).to.equal(2);
    });

    it("should fail withdrawal without deposit", async function () {
      const signers = await getSigners();
      const contractAddress = await contract.getAddress();

      const input = fhevm.createEncryptedInput(contractAddress, signers.alice.address);
      input.add64(100);
      const encrypted = await input.encrypt();

      await expect(
        contract.withdraw(encrypted.handles[0], encrypted.inputProof)
      ).to.be.revertedWith("No deposit found");
    });
  });
});