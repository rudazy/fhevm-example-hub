import { expect } from "chai";
import { ethers } from "hardhat";
import { createInstance } from "../instance";
import { getSigners, initSigners } from "../signers";

describe("ArithmeticOperations", function () {
  let contract: any;
  let fhevm: any;

  before(async function () {
    await initSigners();
    fhevm = await createInstance();
  });

  beforeEach(async function () {
    const signers = await getSigners();
    const Factory = await ethers.getContractFactory("ArithmeticOperations");
    contract = await Factory.connect(signers.alice).deploy();
    await contract.waitForDeployment();
  });

  it("should add two encrypted values", async function () {
    const signers = await getSigners();
    const contractAddress = await contract.getAddress();

    const inputA = fhevm.createEncryptedInput(contractAddress, signers.alice.address);
    inputA.add64(10);
    const encA = await inputA.encrypt();

    const inputB = fhevm.createEncryptedInput(contractAddress, signers.alice.address);
    inputB.add64(5);
    const encB = await inputB.encrypt();

    const tx = await contract.add(
      encA.handles[0], encA.inputProof,
      encB.handles[0], encB.inputProof
    );
    await tx.wait();
    // Result would be 15 (verifiable via decryption)
  });

  it("should subtract two encrypted values", async function () {
    const signers = await getSigners();
    const contractAddress = await contract.getAddress();

    const inputA = fhevm.createEncryptedInput(contractAddress, signers.alice.address);
    inputA.add64(20);
    const encA = await inputA.encrypt();

    const inputB = fhevm.createEncryptedInput(contractAddress, signers.alice.address);
    inputB.add64(8);
    const encB = await inputB.encrypt();

    const tx = await contract.subtract(
      encA.handles[0], encA.inputProof,
      encB.handles[0], encB.inputProof
    );
    await tx.wait();
    // Result would be 12
  });

  it("should multiply two encrypted values", async function () {
    const signers = await getSigners();
    const contractAddress = await contract.getAddress();

    const inputA = fhevm.createEncryptedInput(contractAddress, signers.alice.address);
    inputA.add64(6);
    const encA = await inputA.encrypt();

    const inputB = fhevm.createEncryptedInput(contractAddress, signers.alice.address);
    inputB.add64(7);
    const encB = await inputB.encrypt();

    const tx = await contract.multiply(
      encA.handles[0], encA.inputProof,
      encB.handles[0], encB.inputProof
    );
    await tx.wait();
    // Result would be 42
  });

  it("should divide two encrypted values", async function () {
    const signers = await getSigners();
    const contractAddress = await contract.getAddress();

    const inputA = fhevm.createEncryptedInput(contractAddress, signers.alice.address);
    inputA.add64(100);
    const encA = await inputA.encrypt();

    const inputB = fhevm.createEncryptedInput(contractAddress, signers.alice.address);
    inputB.add64(10);
    const encB = await inputB.encrypt();

    const tx = await contract.divide(
      encA.handles[0], encA.inputProof,
      encB.handles[0], encB.inputProof
    );
    await tx.wait();
    // Result would be 10
  });
});