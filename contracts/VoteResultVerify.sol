//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "usingtellor/contracts/UsingTellor.sol";
import "./MyToken.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "hardhat/console.sol";

contract VoteResultVerify is UsingTellor {
    mapping(uint256 => Proposal) public proposals;
    uint256 public proposalID = 0;
    MyToken public token;
    uint256 public quorumVotesRequired;

    struct Proposal {
        uint256 proposalID;
        address target;
        string description;
        bytes32 queryID;
    }

    constructor(
        address payable _tellorAddress,
        MyToken _token,
        uint256 _quorumVotesRequired
    ) UsingTellor(_tellorAddress) {
        token = _token;
        quorumVotesRequired = _quorumVotesRequired;
    }

    function readVoteResult(bytes32 _queryId)
        public
        view
        returns (bytes memory)
    {
        (bool ifRetrieve, bytes memory _value, ) = getCurrentValue(_queryId);
        if (!ifRetrieve) return "0x";
        return _value;
    }

    function proposeVote(address _target, bytes32 _queryID) external {
        proposalID += 1;
        proposals[proposalID].target = _target;
        proposals[proposalID].proposalID = proposalID;
        proposals[proposalID].queryID = _queryID;
        proposals[proposalID]
            .description = "Mint 1000 tokens to target address";
    }

    function executeProposal(uint256 _proposalID) external {
        console.log("executing proposal");
        Proposal memory proposal = proposals[_proposalID];
        bytes32 queryID = proposal.queryID;
        bytes memory voteResult = readVoteResult(queryID);
        // (uint256 yesVotes, uint256 noVotes) = abi.decode(
        //     voteResult,
        //     (uint256, uint256)
        // );

        uint256 yesVotes =  abi.decode(voteResult, (uint256));

        console.log("yesVotes: %s", yesVotes);
        // require(proposal.proposalID != 0, "Proposal not found");
        // uint256 totalVotes = yesVotes + noVotes;
        // require(totalVotes >= quorumVotesRequired, "Not enough votes");
        // require(yesVotes > noVotes, "Not enough yes votes");
        token.mint(proposals[_proposalID].target, 1000);
    }

    function readVoteResultBefore(bytes32 _queryId, uint256 _timestamp)
        external
        view
        returns (bytes memory, uint256)
    {
        // TIP:
        //For best practices, use getDataBefore with a time buffer to allow
        // time for a value to be disputed
        (
            bool _ifRetrieve,
            bytes memory _value,
            uint256 _timestampRetrieved
        ) = getDataBefore(_queryId, _timestamp);
        if (!_ifRetrieve) return ("0x", 0);
        return (_value, _timestampRetrieved);
    }

    function getCurrentProposalID() public view returns (uint256) {
        return proposalID;
    }

    function getProposalTarget(uint256 _proposalID)
        public
        view
        returns (address)
    {
        return proposals[_proposalID].target;
    }
}
