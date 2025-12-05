import { expect } from "chai";
import { ethers } from "hardhat";
import { createInstance } from "../instance";
import { getSigners, initSigners } from "../signers";

describe("EncryptMultipleValues", function () {
  let contract: any;
  let fhevm: any;

  before(async function () {
    await initSigners();
    fhevm = await createInstance();
  });

  beforeEach(async function () {
    const signers = await getSigners();
    const Factory = await ethers.getContractFactory("EncryptMultipleValues");
    contract = await Factory.connect(signers.alice).deploy();
    await contract.waitForDeployment();
  });

  describe("Multiple Value Encryption", function () {
    it("should store multiple encrypted coordinates", async function () {
      const signers = await getSigners();
      const contractAddress = await contract.getAddress();

      // Create encrypted inputs for X, Y, Z
      const inputX = fhevm.createEncryptedInput(contractAddress, signers.alice.address);
      inputX.add64(10);
      const encX = await inputX.encrypt();

      const inputY = fhevm.createEncryptedInput(contractAddress, signers.alice.address);
      inputY.add64(20);
      const encY = await inputY.encrypt();

      const inputZ = fhevm.createEncryptedInput(contractAddress, signers.alice.address);
      inputZ.add64(30);
      const encZ = await inputZ.encrypt();

      // Store all coordinates
      const tx = await contract.storeCoordinates(
        encX.handles[0], encX.inputProof,
        encY.handles[0], encY.inputProof,
        encZ.handles[0], encZ.inputProof
      );
      await tx.wait();

      await expect(tx).to.emit(contract, "CoordinatesStored");
    });

    it("should retrieve encrypted coordinates", async function () {
      const signers = await getSigners();
      const contractAddress = await contract.getAddress();

      // Store coordinates first
      const inputX = fhevm.createEncryptedInput(contractAddress, signers.alice.address);
      inputX.add64(5);
      const encX = await inputX.encrypt();

      const inputY = fhevm.createEncryptedInput(contractAddress, signers.alice.address);
      inputY.add64(15);
      const encY = await inputY.encrypt();

      const inputZ = fhevm.createEncryptedInput(contractAddress, signers.alice.address);
      inputZ.add64(25);
      const encZ = await inputZ.encrypt();

      await (await contract.storeCoordinates(
        encX.handles[0], encX.inputProof,
        encY.handles[0], encY.inputProof,
        encZ.handles[0], encZ.inputProof
      )).wait();

      // Retrieve coordinates
      const [x, y, z] = await contract.getMyCoordinates();
      
      // Values are encrypted handles
      expect(x).to.not.equal(0n);
      expect(y).to.not.equal(0n);
      expect(z).to.not.equal(0n);
    });

    it("should calculate sum of coordinates", async function () {
      const signers = await getSigners();
      const contractAddress = await contract.getAddress();

      // Store coordinates
      const inputX = fhevm.createEncryptedInput(contractAddress, signers.alice.address);
      inputX.add64(100);
      const encX = await inputX.encrypt();

      const inputY = fhevm.createEncryptedInput(contractAddress, signers.alice.address);
      inputY.add64(200);
      const encY = await inputY.encrypt();

      const inputZ = fhevm.createEncryptedInput(contractAddress, signers.alice.address);
      inputZ.add64(300);
      const encZ = await inputZ.encrypt();

      await (await contract.storeCoordinates(
        encX.handles[0], encX.inputProof,
        encY.handles[0], encY.inputProof,
        encZ.handles[0], encZ.inputProof
      )).wait();

      // Get sum (would be 600 if decrypted)
      const sum = await contract.calculateSum();
      expect(sum).to.not.equal(0n);
    });
  });
});