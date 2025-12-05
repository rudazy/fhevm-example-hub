import { expect } from "chai";
import { ethers } from "hardhat";
import { createInstance } from "../instance";
import { getSigners, initSigners } from "../signers";

describe("EqualityComparison", function () {
  let contract: any;
  let fhevm: any;

  before(async function () {
    await initSigners();
    fhevm = await createInstance();
  });

  beforeEach(async function () {
    const signers = await getSigners();
    const Factory = await ethers.getContractFactory("EqualityComparison");
    contract = await Factory.connect(signers.alice).deploy();
    await contract.waitForDeployment();
  });

  it("should compare equal values correctly", async function () {
    const signers = await getSigners();
    const contractAddress = await contract.getAddress();

    const inputA = fhevm.createEncryptedInput(contractAddress, signers.alice.address);
    inputA.add64(42);
    const encA = await inputA.encrypt();

    const inputB = fhevm.createEncryptedInput(contractAddress, signers.alice.address);
    inputB.add64(42);
    const encB = await inputB.encrypt();

    const tx = await contract.isEqual(
      encA.handles[0], encA.inputProof,
      encB.handles[0], encB.inputProof
    );
    await tx.wait();
    // Result would be true
  });

  it("should compare greater than correctly", async function () {
    const signers = await getSigners();
    const contractAddress = await contract.getAddress();

    const inputA = fhevm.createEncryptedInput(contractAddress, signers.alice.address);
    inputA.add64(100);
    const encA = await inputA.encrypt();

    const inputB = fhevm.createEncryptedInput(contractAddress, signers.alice.address);
    inputB.add64(50);
    const encB = await inputB.encrypt();

    const tx = await contract.isGreaterThan(
      encA.handles[0], encA.inputProof,
      encB.handles[0], encB.inputProof
    );
    await tx.wait();
    // Result would be true (100 > 50)
  });

  it("should compare less than correctly", async function () {
    const signers = await getSigners();
    const contractAddress = await contract.getAddress();

    const inputA = fhevm.createEncryptedInput(contractAddress, signers.alice.address);
    inputA.add64(25);
    const encA = await inputA.encrypt();

    const inputB = fhevm.createEncryptedInput(contractAddress, signers.alice.address);
    inputB.add64(75);
    const encB = await inputB.encrypt();

    const tx = await contract.isLessThan(
      encA.handles[0], encA.inputProof,
      encB.handles[0], encB.inputProof
    );
    await tx.wait();
    // Result would be true (25 < 75)
  });
});