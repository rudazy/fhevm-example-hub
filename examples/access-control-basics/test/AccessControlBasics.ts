import { expect } from "chai";
import { ethers } from "hardhat";
import { createInstance } from "../instance";
import { getSigners, initSigners } from "../signers";

describe("AccessControlBasics", function () {
  let contract: any;
  let fhevm: any;

  before(async function () {
    await initSigners();
    fhevm = await createInstance();
  });

  beforeEach(async function () {
    const signers = await getSigners();
    const Factory = await ethers.getContractFactory("AccessControlBasics");
    contract = await Factory.connect(signers.alice).deploy();
    await contract.waitForDeployment();
  });

  describe("Access Control", function () {
    it("should allow owner to set secret", async function () {
      const signers = await getSigners();
      const contractAddress = await contract.getAddress();

      const input = fhevm.createEncryptedInput(contractAddress, signers.alice.address);
      input.add64(42);
      const encrypted = await input.encrypt();

      const tx = await contract.setSecret(encrypted.handles[0], encrypted.inputProof);
      await tx.wait();

      await expect(tx).to.emit(contract, "SecretUpdated");
    });

    it("should prevent non-owner from setting secret", async function () {
      const signers = await getSigners();
      const contractAddress = await contract.getAddress();

      const input = fhevm.createEncryptedInput(contractAddress, signers.bob.address);
      input.add64(99);
      const encrypted = await input.encrypt();

      await expect(
        contract.connect(signers.bob).setSecret(encrypted.handles[0], encrypted.inputProof)
      ).to.be.revertedWith("Only owner");
    });

    it("should authorize a reader", async function () {
      const signers = await getSigners();

      const tx = await contract.authorizeReader(signers.bob.address);
      await tx.wait();

      await expect(tx).to.emit(contract, "ReaderAuthorized");
      expect(await contract.isAuthorized(signers.bob.address)).to.equal(true);
    });

    it("should prevent unauthorized access", async function () {
      const signers = await getSigners();

      await expect(
        contract.connect(signers.bob).getSecret()
      ).to.be.revertedWith("Not authorized");
    });
  });
});