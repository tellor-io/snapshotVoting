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

  let valuesEncoded;

  abiCoder = new ethers.utils.AbiCoder();
  let queryDataArgs, queryData, queryID;

  // Set up Tellor Playground Oracle and SnapshotVoting
  beforeEach(async function () {
    const TellorOracle = await ethers.getContractFactory(abi, bytecode);
    tellorOracle = await TellorOracle.deploy();
    await tellorOracle.deployed();

    const SnapshotVoting = await ethers.getContractFactory("SnapshotVoting");
    snapshotVoting = await SnapshotVoting.deploy(tellorOracle.address, 10000);
    await snapshotVoting.deployed();

    const MyToken = await ethers.getContractFactory("MyToken");
    myToken = MyToken.attach(snapshotVoting.getTokenAddress());

    [owner, addr1, addr2] = await ethers.getSigners();
    valuesEncoded = abiCoder.encode(["uint256[]"], [[10023, 1058]]);
  });

  it("Test readProposalResultBefore()", async function () {
    queryDataArgs = abiCoder.encode(["string"], ["1"]);

    queryData = abiCoder.encode(
      ["string", "bytes"],
      ["Snapshot", queryDataArgs]
    );

    queryID = ethers.utils.keccak256(queryData);

    // submit value takes 4 args : queryId, value, nonce and queryData
    await tellorOracle.submitValue(queryID, valuesEncoded, 0, queryData);

    await h.advanceTime(10000);
    blocky1 = await h.getBlock();

    //return true if value is found
    expect(
      (await snapshotVoting.getDataBefore(queryID, blocky1.timestamp))[0]
    ).to.equal(true);

    expect(
      (await snapshotVoting.readProposalResultBefore(queryID, blocky1.timestamp))
      .map(x=>x.toNumber())
    ).to.deep.equal([10023, 1058]);

    queryDataArgs = abiCoder.encode(["string"], ["5"]);

    queryData = abiCoder.encode(
      ["string", "bytes"],
      ["Snapshot", queryDataArgs]
    );

    queryID = ethers.utils.keccak256(queryData);

    //return false if value is not found
    expect(
      (await snapshotVoting.getDataBefore(queryID, blocky1.timestamp))[0]
    ).to.equal(false);

    await h.expectThrow(
      snapshotVoting.readProposalResultBefore(queryID, blocky1.timestamp)
    );
  });

  it("Test proposeVote()", async function () {
    await snapshotVoting.proposeVote(addr1.address, "1");
    await h.expectThrow(snapshotVoting.proposeVote(addr2.address, "1"));
  });

  it("Test executeProposal()", async function () {
    //throw when proposalID not found
    await snapshotVoting.proposeVote(addr1.address, "1");

    queryDataArgs = abiCoder.encode(["string"], ["1"]);

    queryData = abiCoder.encode(
      ["string", "bytes"],
      ["Snapshot", queryDataArgs]
    );
    queryID = ethers.utils.keccak256(queryData);

    // submit value takes 4 args : queryId, value, nonce and queryData
    await tellorOracle.submitValue(queryID, valuesEncoded, 0, queryData);
    await h.advanceTime(10000);
    await h.expectThrow(snapshotVoting.executeProposal("0"));

    //throw when not enough votes (min. 10 000)needed
    await snapshotVoting.proposeVote(addr1.address, "2");

    queryDataArgs = abiCoder.encode(["string"], ["2"]);

    queryData = abiCoder.encode(
      ["string", "bytes"],
      ["Snapshot", queryDataArgs]
    );

    queryID = ethers.utils.keccak256(queryData);

    await tellorOracle.submitValue(
      queryID,
      abiCoder.encode(["uint256[]"], [[4000, 3000]]),
      0,
      queryData
    );

    await h.advanceTime(10000);
    await h.expectThrow(snapshotVoting.executeProposal("2"));

    //throw when not enough yes votes(51% needed)
    await snapshotVoting.proposeVote(addr1.address, "3");

    queryDataArgs = abiCoder.encode(["string"], ["3"]);

    queryData = abiCoder.encode(
      ["string", "bytes"],
      ["Snapshot", queryDataArgs]
    );

    queryID = ethers.utils.keccak256(queryData);

    await tellorOracle.submitValue(
      queryID,
      abiCoder.encode(["uint256[]"], [[5000, 6000]]),
      0,
      queryData
    );

    await h.advanceTime(10000);
    await h.expectThrow(snapshotVoting.executeProposal("3"));

    //succeed
    await snapshotVoting.proposeVote(addr1.address, "4");

    queryDataArgs = abiCoder.encode(["string"], ["4"]);

    queryData = abiCoder.encode(
      ["string", "bytes"],
      ["Snapshot", queryDataArgs]
    );

    queryID = ethers.utils.keccak256(queryData);
    await tellorOracle.submitValue(queryID, valuesEncoded, 0, queryData);

    await h.advanceTime(10000);
    await snapshotVoting.executeProposal("4");
    expect(await myToken.balanceOf(addr1.address)).to.equal(1000);

    //throw when executing a CLOSED proposal
    await h.expectThrow(snapshotVoting.executeProposal("4"));
  });

  it("Test invalidateProposal()", async function () {
    await snapshotVoting.proposeVote(addr1.address, "1");
    await h.expectThrow(snapshotVoting.connect(addr1).invalidateProposal("1"));
    await snapshotVoting.invalidateProposal("1");

    await h.expectThrow(snapshotVoting.executeProposal("1"));
  });
  it("Test mint()", async function () {
    //throw when minting as non governance address
    await h.expectThrow(myToken.mint(owner.address, 100));
  });
});
