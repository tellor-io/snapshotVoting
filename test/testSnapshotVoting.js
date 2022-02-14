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

  let owner, addr1, addr2;
  const proposalID = 1;
  //result votes from proposal
  const value1 = 10023;
  const value2 = 1058;

  let valuesEncoded;

  abiCoder = new ethers.utils.AbiCoder();
  let queryDataArgs, queryData, queryID;

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

    queryDataArgs = abiCoder.encode(
      ["uint256", "uint256"],
      [voteResultVerify.address, proposalID]
    );

    queryData = abiCoder.encode(
      ["string", "bytes"],
      ["Snapshot", queryDataArgs]
    );

    queryID = ethers.utils.keccak256(queryData);

    [owner, addr1, addr2] = await ethers.getSigners();
    valuesEncoded = abiCoder.encode(["uint256", "uint256"], [value1, value2]);
  });

  it("Test readVoteResult()", async function () {
    // submit value takes 4 args : queryId, value, nonce and queryData

    await tellorOracle.submitValue(queryID, valuesEncoded, 0, queryData);

    await h.advanceTime(10000);

    blocky1 = await h.getBlock();

    retrievedVal = await voteResultVerify.readVoteResultBefore(
      queryID,
      blocky1.timestamp - 9000
    );
    expect(parseInt(retrievedVal)).to.equal(value1, value2);
  });

  it("Test proposeVote()", async function () {
    await voteResultVerify.proposeVote(addr1.address);
    let propID = await voteResultVerify.getCurrentProposalID();
    expect(propID).to.equal(1);
    let propTarget = await voteResultVerify.getProposalTarget(1);
    expect(propTarget).to.equal(addr1.address);
  });

  it("Test executeProposal()", async function () {
    await voteResultVerify.proposeVote(addr1.address);
    await tellorOracle.submitValue(queryID, valuesEncoded, 0, queryData);
    await h.advanceTime(10000);
    await voteResultVerify.executeProposal(1);
    let balance = await myToken.balanceOf(addr1.address);
    expect(balance).to.equal(1000);
  });
});
