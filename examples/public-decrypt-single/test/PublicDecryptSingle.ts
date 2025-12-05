import { expect } from "chai";
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
});