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
  let queryDataArgs2, queryData2, queryID2;

  // Set up Tellor Playground Oracle and SnapshotVoting
  beforeEach(async function () {
    const TellorOracle = await ethers.getContractFactory(abi, bytecode);
    tellorOracle = await TellorOracle.deploy();
    await tellorOracle.deployed();

    const SnapshotVoting = await ethers.getContractFactory("SnapshotVoting");
    snapshotVoting = await SnapshotVoting.deploy(tellorOracle.address, 10000);
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

    queryDataArgs2 = abiCoder.encode(
      ["uint256", "uint256"],
      [snapshotVoting.address, 5]
    );

    queryData2 = abiCoder.encode(
      ["string", "bytes"],
      ["Snapshot", queryDataArgs2]
    );

    queryID2 = ethers.utils.keccak256(queryData2);

    [owner, addr1, addr2] = await ethers.getSigners();
    valuesEncoded = abiCoder.encode(["uint256", "uint256"], [value1, value2]);
  });

  it("Test readVoteResultBefore()", async function () {
    // submit value takes 4 args : queryId, value, nonce and queryData
    await tellorOracle.submitValue(queryID, valuesEncoded, 0, queryData);

    await h.advanceTime(10000);
    blocky1 = await h.getBlock();

    //return true if value is found
    expect(
      (await snapshotVoting.getDataBefore(queryID, blocky1.timestamp))[0]
    ).to.equal(true);

    //return false if value is not found
    expect(
      (await snapshotVoting.getDataBefore(queryID2, blocky1.timestamp))[0]
    ).to.equal(false);

    expect(
      parseInt(
        await snapshotVoting.readVoteResultBefore(queryID, blocky1.timestamp)
      )
    ).to.equal(value1, value2);

    await h.expectThrow(
      snapshotVoting.readVoteResultBefore(queryID2, blocky1.timestamp)
    );
  });

  it("Test proposeVote()", async function () {
    await snapshotVoting.proposeVote(addr1.address);
    expect(await snapshotVoting.getCurrentProposalID()).to.equal(1);
    expect(await snapshotVoting.getProposalTarget(1)).to.equal(addr1.address);
  });

  it("Test executeProposal()", async function () {
    //throw when proposalID not found
    await snapshotVoting.proposeVote(addr1.address);
    await tellorOracle.submitValue(queryID, valuesEncoded, 0, queryData);
    await h.advanceTime(10000);
    await h.expectThrow(snapshotVoting.executeProposal(0));

    //throw when not enough votes (min. 10 000)needed
    await snapshotVoting.proposeVote(addr1.address);
    await tellorOracle.submitValue(
      queryID,
      abiCoder.encode(["uint256", "uint256"], [4000, 3000]),
      1,
      queryData
    );
    await h.advanceTime(10000);
    await h.expectThrow(snapshotVoting.executeProposal(2));

    //throw when not enough yes votes(51% needed)
    await snapshotVoting.proposeVote(addr1.address);
    await tellorOracle.submitValue(
      queryID,
      abiCoder.encode(["uint256", "uint256"], [5000, 6000]),
      2,
      queryData
    );
    await h.advanceTime(10000);
    await h.expectThrow(snapshotVoting.executeProposal(3));

    //succeed
    await tellorOracle.submitValue(queryID, valuesEncoded, 3, queryData);
    await h.advanceTime(10000);
    await snapshotVoting.executeProposal(1);
    expect(await myToken.balanceOf(addr1.address)).to.equal(1000);

    //throw when executing a CLOSED proposal
    await h.expectThrow(snapshotVoting.executeProposal(1));
  });

  it("Test setRewardsToken()", async function () {
    //throw when deployed with a token
    await h.expectThrow(snapshotVoting.setRewardsToken(addr2.address));
  });

  it("Test mint()", async function () {
    //throw when minting as non governance address
    await h.expectThrow(myToken.mint(owner.address, 100));
  });
});
