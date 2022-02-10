//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "usingtellor/contracts/UsingTellor.sol";
import "./MyToken.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "hardhat/console.sol";

contract VoteResultVerify is UsingTellor {
    mapping(uint256 => Proposal) public proposals;
    uint256 private proposalID = 0;
    MyToken private token;
    uint256 public quorumVotesRequired;

    struct Proposal {
        uint256 proposalID;
        address target;
        string description;
    }

    constructor(
        address payable _tellorAddress,
        MyToken _token,
        uint256 _quorumVotesRequired
    ) UsingTellor(_tellorAddress) {
        token = _token;
        quorumVotesRequired = _quorumVotesRequired;
    }


    function proposeVote(address _target) external {
        proposalID += 1;
        proposals[proposalID].target = _target;
        proposals[proposalID].proposalID = proposalID;
        proposals[proposalID]
            .description = "Mint 1000 tokens to target address";
    }

    function executeProposal(
        uint256 _proposalID
    ) external {
        Proposal memory proposal = proposals[_proposalID];
        require(proposal.proposalID != 0, "Proposal not found");
        bytes32 _queryID = keccak256(abi.encode("Snapshot",abi.encode(address(this),_proposalID)));
        uint256 _yesAmount;
        uint256 _noAmount;
        (_yesAmount,_noAmount) = readVoteResultBefore(_queryID,block.timestamp - 1 hours);
        uint256 totalVotes = _yesAmount + _noAmount;
        require(totalVotes >= quorumVotesRequired, "Not enough votes");
        require(_yesAmount > _noAmount, "Not enough yes votes");
        token.mint(proposals[_proposalID].target, 1000);
    }

    function readVoteResultBefore(bytes32 _queryId, uint256 _timestamp)
        public
        view
        returns (uint256, uint256)
    {
        // TIP:
        //For best practices, use getDataBefore with a time buffer to allow
        // time for a value to be disputed
        (
            bool _ifRetrieve,
            bytes memory _value,
        ) = getDataBefore(_queryId, _timestamp);
        require(_ifRetrieve, "must get data to execute vote");
        uint256 _yes;
        uint256 _no;
        (_yes,_no) = abi.decode(_value,(uint256,uint256));
        return (_yes,_no);
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
