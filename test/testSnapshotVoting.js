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
  let myToken;

  const queryIds = [h.uintTob32(1), h.uintTob32(2)];
  //result votes from proposal
  // const mockValue = [10023, 1058];
  const value1 = 10023;
  const value2 = 1058;
  const value1toBytes = h.bytes(value1);
  const value2toBytes = h.bytes(value2);

  // Set up Tellor Playground Oracle and VoteResultVerify
  beforeEach(async function () {
    const TellorOracle = await ethers.getContractFactory(abi, bytecode);
    tellorOracle = await TellorOracle.deploy();
    await tellorOracle.deployed();
    console.log("Tellor Oracle deployed at: ", tellorOracle.address);

    const MyToken = await ethers.getContractFactory("MyToken");
    myToken = await MyToken.deploy("MyToken", "MYT");
    await myToken.deployed();
    console.log("MyToken deployed at: ", myToken.address);

    const VoteResultVerify = await ethers.getContractFactory(
      "VoteResultVerify"
    );
    voteResultVerify = await VoteResultVerify.deploy(
      tellorOracle.address,
      myToken.address,
      10000
    );
    await voteResultVerify.deployed();

    [owner, addr1, addr2] = await ethers.getSigners();
  });

  it("Proposes new vote", async function () {
    const propAddr = addr1.address;

    await voteResultVerify.proposeVote(propAddr);
    let propID = await voteResultVerify.getCurrentProposalID();
    expect(propID).to.equal(1);

    let prop = await voteResultVerify.getProposalTarget(1);
    expect(prop).to.equal(propAddr);
  });

  it("Updates voteResult", async function () {
    // submit value takes 4 args : queryId, value, nonce and queryData
    await tellorOracle.submitValue(queryIds[0], value1, 0, "0x");
    await tellorOracle.submitValue(queryIds[1], value2, 0, "0x");

    let retrievedVal1 = await voteResultVerify.readVoteResult(queryIds[0]);
    let retrievedVal2 = await voteResultVerify.readVoteResult(queryIds[1]);
    expect(retrievedVal1).to.equal(value1toBytes);
  });

  it("Executes vote and mint tokens", async function () {
    const propAddr = addr1.address;

    await voteResultVerify.proposeVote(propAddr);

    await tellorOracle.submitValue(queryIds[0], value1, 0, "0x");
    await tellorOracle.submitValue(queryIds[1], value2, 0, "0x");

    await voteResultVerify.executeProposal(
      1,
      parseInt(await voteResultVerify.readVoteResult(queryIds[0])),
      parseInt(await voteResultVerify.readVoteResult(queryIds[1]))
    );

    let balance = await myToken.balanceOf(propAddr);
    expect(balance).to.equal(1000);
  });
});
