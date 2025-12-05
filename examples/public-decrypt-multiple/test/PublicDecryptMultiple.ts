import { expect } from "chai";
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
});