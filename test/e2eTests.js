const { expect, assert } = require("chai");
const { ethers } = require("hardhat");
const {
  abi,
  bytecode,
} = require("usingtellor/artifacts/contracts/TellorPlayground.sol/TellorPlayground.json");
const h = require("usingtellor/test/helpers/helpers.js");

describe("End-to-End Tests", function () {
  let snapshotVoting, tellorOracle, myToken;
  let addresses;

  abiCoder = new ethers.utils.AbiCoder();
  let queryDataArgs, queryData, queryID;

  // Set up Tellor Playground Oracle and SnapshotVoting
  beforeEach("deploy and setup snapshotVoting", async function () {
    const TellorOracle = await ethers.getContractFactory(abi, bytecode);
    tellorOracle = await TellorOracle.deploy();
    await tellorOracle.deployed();

    const SnapshotVoting = await ethers.getContractFactory("SnapshotVoting");
    snapshotVoting = await SnapshotVoting.deploy(tellorOracle.address);
    await snapshotVoting.deployed();

    const MyToken = await ethers.getContractFactory("MyToken");
    myToken = MyToken.attach(snapshotVoting.getTokenAddress());

    addresses = await ethers.getSigners();
    for (let i = 1; i <= 3; i++) {
      await snapshotVoting.proposeVote(addresses[i].address, i.toString());

      queryDataArgs = abiCoder.encode(["string"], [i.toString()]);

      queryData = abiCoder.encode(
        ["string", "bytes"],
        ["Snapshot", queryDataArgs]
      );

      queryID = ethers.utils.keccak256(queryData);

      //fail, succeed, succeed
      await tellorOracle.submitValue(
        queryID,
        abiCoder.encode(["bool"], [i == 1? false : true]),
        0,
        queryData
      );
    }
    await h.advanceTime(10000);
  });

  it("Create and execute three different proposals", async function () {
    await h.expectThrow(snapshotVoting.executeProposal("1"));
    await snapshotVoting.executeProposal("2");
    await snapshotVoting.executeProposal("3");

    expect(await myToken.balanceOf(addresses[1].address)).to.equal(0);
    expect(await myToken.balanceOf(addresses[2].address)).to.equal(
      ethers.utils.parseUnits("1000", 18)
    );
    expect(await myToken.balanceOf(addresses[3].address)).to.equal(
      ethers.utils.parseUnits("1000", 18)
    );
  });

  it("check proposal status", async function () {
    expect(await snapshotVoting.getStatus("1")).to.equal(0);

    await snapshotVoting.executeProposal("2");

    expect(await snapshotVoting.getStatus("2")).to.equal(1);

    await snapshotVoting.connect(addresses[0]).invalidateProposal("3");
    expect(await snapshotVoting.getStatus("3")).to.equal(2);
  });

  it("submit new values", async function () {
    await h.expectThrow(snapshotVoting.executeProposal("1"));

    queryDataArgs = abiCoder.encode(["string"], ["1"]);

    queryData = abiCoder.encode(
      ["string", "bytes"],
      ["Snapshot", queryDataArgs]
    );

    queryID = ethers.utils.keccak256(queryData);

    await tellorOracle.submitValue(
      queryID,
      abiCoder.encode(["bool"], [true]),
      1,
      queryData
    );

    await h.advanceTime(10000);

    await snapshotVoting.executeProposal("1");
    expect(await snapshotVoting.getStatus("1")).to.equal(1);
  });
});
