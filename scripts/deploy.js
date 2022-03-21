
require("dotenv").config();

const hre = require("hardhat");

//npx hardhat run scripts/deploy.js --network rinkeby

//rinkeby
const tellorOracleAddress = "0x18431fd88adF138e8b979A7246eb58EA7126ea16";

async function deploySnapshotVoting(_network, _pk, _nodeURL) {
  console.log("deploy SnapshotVoting");
  await run("compile");
  const net = _network;

  ////////////////SnapshotVoting
  console.log("Starting deployment for snapshotvoting contract...")
  const SnapshotVoting = await ethers.getContractFactory("SnapshotVoting")
  const snapshotVoting = await SnapshotVoting.deploy(
    tellorOracleAddress,
    10000
  );

  await snapshotVoting.deployed();
  console.log("SnapshotVoting deployed at: " + snapshotVoting.address);

  if (net == "mainnet") {
    console.log(
      "SnapshotVoting contract deployed to:",
      "https://etherscan.io/address/" + snapshotVoting.address
    );
    console.log(
      "    transaction hash:",
      "https://etherscan.io/tx/" + snapshotVoting.deployTransaction.hash
    );
  } else if (net == "rinkeby") {
    console.log(
      "SnapshotVoting contract deployed to:",
      "https://rinkeby.etherscan.io/address/" + snapshotVoting.address
    );
    console.log(
      "    transaction hash:",
      "https://rinkeby.etherscan.io/tx/" + snapshotVoting.deployTransaction.hash
    );
  } else {
    console.log("Please add network explorer details");
  }

  // Wait for few confirmed transactions.
  // Otherwise the etherscan api doesn't find the deployed contract.
  console.log("waiting for SnapshotVoting tx confirmation...");
  await snapshotVoting.deployTransaction.wait(5);

  console.log("submitting SnapshotVoting contract for verification...");

  await run("verify:verify", {
    address: snapshotVoting.address,
    constructorArguments: [tellorOracleAddress, 10000],
  });

  console.log("SnapshotVoting contract verified");
}

deploySnapshotVoting(
  "rinkeby",
  process.env.PRIVATE_KEY,
  process.env.INFURA_API_KEY
)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
