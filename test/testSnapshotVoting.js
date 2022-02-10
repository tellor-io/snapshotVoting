const { expect, assert } = require("chai");
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

  const queryId = h.uintTob32(1);
  //result votes from proposal
  const value1 = 10023;
  const value2 = 1058;

  // Set up Tellor Playground Oracle and VoteResultVerify
  beforeEach(async function () {
    const TellorOracle = await ethers.getContractFactory(abi, bytecode);
    tellorOracle = await TellorOracle.deploy();
    await tellorOracle.deployed();

    const MyToken = await ethers.getContractFactory("MyToken");
    myToken = await MyToken.deploy("MyToken", "MYT");
    await myToken.deployed();

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

  it("Test Constructor()", async function () {
    assert(await voteResultVerify.token() == myToken.address, "token address should be correct");
    assert(await voteResultVerify.quorumVotesRequired() == 10000, "quarumVotesRequired should be correct");
  });

  it("Test readVoteResult()", async function () {
    // submit value takes 4 args : queryId, value, nonce and queryData

    await tellorOracle.submitValue(queryId, h.bytes([value1, value2]), 0, "0x");

    const retrievedVal = await voteResultVerify.readVoteResult(queryId);
    expect(retrievedVal).to.equal(h.bytes([value1, value2]));
  });


  it("Test proposeVote()", async function () {
    const propAddr = addr1.address;

    await voteResultVerify.proposeVote(propAddr, queryId);
    let propID = await voteResultVerify.getCurrentProposalID();
    expect(propID).to.equal(1);

    let propTarget = await voteResultVerify.getProposalTarget(1);
    expect(propTarget).to.equal(propAddr);
  });

  it("Test executeProposal()", async function () {
    const propAddr = addr1.address;

    await voteResultVerify.proposeVote(propAddr, queryId);

    await tellorOracle.submitValue(queryId, value1, 0, "0x");

    await voteResultVerify.executeProposal(1);
    // let balance = await myToken.balanceOf(propAddr);
    // expect(balance).to.equal(1000);
  });
});
