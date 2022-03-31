[![Tests](https://github.com/tellor-io/snapshotVoting/actions/workflows/tests.yml/badge.svg)](https://github.com/tellor-io/snapshotVoting/actions/workflows/tests.ymli)

## Sample project SnapshotVoting
A sample contract for using Tellor for verifying [Snapshot](https://snapshot.org/#/) vote results.
This sample contract mints 1000 tokens to a target address when the off-chain proposal passes.

For more in-depth information about Tellor check out our [documentation](https://docs.tellor.io/tellor/), [whitepaper](https://docs.tellor.io/tellor/whitepaper/introduction) and [website](https://tellor.io/).


## Setting up and testing

Clone project
```
git clone https://github.com/tellor-io/snapshotVoting.git
```

Install Dependencies
```
npm install
```
Compile Smart Contracts
```
npx hardhat compile
```

Test Locally
```
npx hardhat test
```

Deploy
```bash
npx hardhat run --network <your-network> scripts/deploy.js
```

## Maintainers <a name="maintainers"> </a>
This repository is maintained by the [Tellor team](https://github.com/orgs/tellor-io/people)


## How to Contribute<a name="how2contribute"> </a>  

Check out our issues log here on Github or feel free to reach out anytime [info@tellor.io](mailto:info@tellor.io).

## Copyright

Tellor Inc. 2022


