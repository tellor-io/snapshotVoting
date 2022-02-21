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
    snapshotVoting = await SnapshotVoting.deploy(tellorOracle.address, 10000);
    await snapshotVoting.deployed();

    const MyToken = await ethers.getContractFactory("MyToken");
    myToken = await MyToken.deploy(snapshotVoting.address);
    await myToken.deployed();

    await snapshotVoting.setRewardsToken(myToken.address);

    addresses = await ethers.getSigners();
  });

  it("Create and execute three different proposals", async function () {
    for (let i = 1; i < 4; i++) {
      await snapshotVoting.proposeVote(addresses[i].address);

      queryDataArgs = abiCoder.encode(
        ["uint256", "uint256"],
        [snapshotVoting.address, i]
      );

      queryData = abiCoder.encode(
        ["string", "bytes"],
        ["Snapshot", queryDataArgs]
      );

      queryID = ethers.utils.keccak256(queryData);

      //fail, succeed, succeed
      await tellorOracle.submitValue(
        queryID,
        abiCoder.encode(["uint256", "uint256"], [5000 * i, 1200 * i]),
        0,
        queryData
      );

      await h.advanceTime(10000);
    }
    await h.expectThrow(snapshotVoting.executeProposal(1));
    await snapshotVoting.executeProposal(2);
    await snapshotVoting.executeProposal(3);

    expect(await myToken.balanceOf(addresses[1].address)).to.equal(0);
    expect(await myToken.balanceOf(addresses[2].address)).to.equal(1000);
    expect(await myToken.balanceOf(addresses[3].address)).to.equal(1000);

    expect(await snapshotVoting.getCurrentProposalID()).to.equal(3);
  });
});
