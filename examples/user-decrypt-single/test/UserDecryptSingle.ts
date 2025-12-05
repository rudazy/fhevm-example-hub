import { expect } from "chai";
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
});