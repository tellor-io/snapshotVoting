const { expect } = require("chai");
const { ethers } = require("hardhat");
const {
  abi,
  bytecode,
} = require("usingtellor/artifacts/contracts/TellorPlayground.sol/TellorPlayground.json");
const h = require("usingtellor/test/helpers/helpers.js");

describe("Tellor verify snapshot vote results", function () {
  let voteResultVerify;
  let tellorOracle;

  const queryId = h.uintTob32(1);
  //result voting passed
  const mockValue = "Vote Passed";
  const mocktoBytes = h.bytes(mockValue);

  // Set up Tellor Playground Oracle and VoteResultVerify
  beforeEach(async function () {
    let TellorOracle = await ethers.getContractFactory(abi, bytecode);
    tellorOracle = await TellorOracle.deploy();
    await tellorOracle.deployed();

    let VoteResultVerify = await ethers.getContractFactory("VoteResultVerify");
    voteResultVerify = await VoteResultVerify.deploy(tellorOracle.address);
    await voteResultVerify.deployed();
  });

  it("Updates voteResult", async function () {
    // submit value takes 4 args : queryId, value, nonce and queryData
    await tellorOracle.submitValue(queryId, mocktoBytes, 0, "0x");
    let retrievedVal = await voteResultVerify.readVoteResult(queryId);
    expect(retrievedVal).to.equal("Vote Passed");
    expect(h.bytes("Vote In Progress")).to.not.equal(mocktoBytes);
  });
});