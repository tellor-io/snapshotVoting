const { expect, assert } = require("chai");
const { ethers } = require("hardhat");
const {
  abi,
  bytecode,
} = require("usingtellor/artifacts/contracts/TellorPlayground.sol/TellorPlayground.json");
const h = require("usingtellor/test/helpers/helpers.js");

describe("Tellor verify snapshot vote results", function () {
  let snapshotVoting;
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

  // Set up Tellor Playground Oracle and SnapshotVoting
  beforeEach(async function () {
    const TellorOracle = await ethers.getContractFactory(abi, bytecode);
    tellorOracle = await TellorOracle.deploy();
    await tellorOracle.deployed();

    const SnapshotVoting = await ethers.getContractFactory(
      "SnapshotVoting"
    );
    snapshotVoting = await SnapshotVoting.deploy(
      tellorOracle.address,
      10000
    );
    await snapshotVoting.deployed();

    const MyToken = await ethers.getContractFactory("MyToken");
    myToken = await MyToken.deploy(snapshotVoting.address);
    await myToken.deployed();

    await snapshotVoting.setRewardsToken(myToken.address);

    queryDataArgs = abiCoder.encode(
      ["uint256", "uint256"],
      [snapshotVoting.address, proposalID]
    );

    queryData = abiCoder.encode(
      ["string", "bytes"],
      ["Snapshot", queryDataArgs]
    );

    queryID = ethers.utils.keccak256(queryData);

    [owner, addr1, addr2] = await ethers.getSigners();
    valuesEncoded = abiCoder.encode(["uint256", "uint256"], [value1, value2]);
  });

  it("Test readVoteResultBefore()", async function () {
    // submit value takes 4 args : queryId, value, nonce and queryData

    await tellorOracle.submitValue(queryID, valuesEncoded, 0, queryData);

    await h.advanceTime(10000);

    blocky1 = await h.getBlock();

    retrievedVal = await snapshotVoting.readVoteResultBefore(
      queryID,
      blocky1.timestamp - 9000
    );
    expect(parseInt(retrievedVal)).to.equal(value1, value2);
  });

  it("Test proposeVote()", async function () {
    await snapshotVoting.proposeVote(addr1.address);
    let propID = await snapshotVoting.getCurrentProposalID();
    expect(propID).to.equal(1);
    let propTarget = await snapshotVoting.getProposalTarget(1);
    expect(propTarget).to.equal(addr1.address);
  });

  it("Test executeProposal()", async function () {
    await snapshotVoting.proposeVote(addr1.address);
    await tellorOracle.submitValue(queryID, valuesEncoded, 0, queryData);
    await h.advanceTime(10000);
    await snapshotVoting.executeProposal(1);
    let balance = await myToken.balanceOf(addr1.address);
    expect(balance).to.equal(1000);
  });
});
