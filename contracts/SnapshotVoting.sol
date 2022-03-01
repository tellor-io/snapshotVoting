//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "usingtellor/contracts/UsingTellor.sol";
import "./MyToken.sol";

/**
 @author Tellor Inc.
 @title SnapshotVoting
 @dev This is the SnapshotVoting contract which defines the functionality for
 * using Tellor to verify snapshot vote results
*/
contract SnapshotVoting is UsingTellor {
    // Events
    event ProposalCreated(
        address indexed _snapshotVotingAddress,
        uint256 proposalID
    );
    event ProposalExecuted(
        address indexed _snapshotVotingAddress,
        uint256 proposalID
    );

    // Storage
    mapping(uint256 => Proposal) public proposals;

    uint256 private quorumVotes;

    MyToken private token;
    address private arbitrator;

    // Enums
    enum Status {
        OPEN,
        CLOSED,
        INVALID
    }

    // Structs
    struct Proposal {
        uint256 proposalID;
        uint256 yesVotes;
        uint256 noVotes;
        address target;
        string description;
        Status status;
    }

    /*Functions*/
    /**
     * @dev Initializes the contract with the parameters, initializes the token
     * @param _tellorAddress address of Tellor contract
     * @param _quorumVotes total votes required to execute the proposal
     */
    constructor(address payable _tellorAddress, uint256 _quorumVotes)
        UsingTellor(_tellorAddress)
    {
        arbitrator = msg.sender;
        quorumVotes = _quorumVotes;
        token = new MyToken(address(this));
    }

    /**
     * @dev Create a proposal
     * @param _target address of the proposal
     * @param _proposalId proposalId Id that identifies the proposal uniquely
     */
    function proposeVote(address _target, uint256 _proposalId) external {
        require(
            proposals[_proposalId].proposalID == 0,
            "Proposal already submitted"
        );
        proposals[_proposalId].target = _target;
        proposals[_proposalId].proposalID = _proposalId;
        proposals[_proposalId].status = Status.OPEN;
        proposals[_proposalId]
            .description = "Mint 1000 tokens to target address";

        emit ProposalCreated(_target, _proposalId);
    }

    /**
     * @dev Execute a passed proposal
     * @param _proposalID proposalId Id that identifies the proposal uniquely
     */
    function executeProposal(uint256 _proposalID) external {
        Proposal memory proposal = proposals[_proposalID];
        require(proposal.proposalID != 0, "Proposal not found");
        require(proposal.status == Status.OPEN, "Proposal is not valid");
        bytes32 _queryID = keccak256(
            abi.encode("Snapshot", abi.encode(address(this), _proposalID))
        );
        (uint256 _yesAmount, uint256 _noAmount) = readProposalResultBefore(
            _queryID,
            block.timestamp - 1 hours
        );
        proposals[_proposalID].yesVotes = _yesAmount;
        proposals[_proposalID].noVotes = _noAmount;
        uint256 totalVotes = _yesAmount + _noAmount;
        require(totalVotes >= quorumVotes, "Not enough votes");
        require(_yesAmount > _noAmount, "Not enough yes votes");
        proposals[_proposalID].status = Status.CLOSED;
        token.mint(proposals[_proposalID].target, 1000);

        emit ProposalExecuted(proposal.target, _proposalID);
    }

    /**
     * @dev Get the proposal result and allow time for value to be disputed
     * @param _queryId id of desired data feed
     * @param _timestamp to retrieve data from
     * @return result of the proposal
     */
    function readProposalResultBefore(bytes32 _queryId, uint256 _timestamp)
        public
        view
        returns (uint256, uint256)
    {
        // TIP:
        //For best practices, use getDataBefore with a time buffer to allow
        // time for a value to be disputed
        (bool _ifRetrieve, bytes memory _value, ) = getDataBefore(
            _queryId,
            _timestamp
        );
        require(_ifRetrieve, "must get data to execute vote");
        (uint256 _yes, uint256 _no) = abi.decode(_value, (uint256, uint256));
        return (_yes, _no);
    }

    /**
     * @dev Marks a proposal as invalid
     * @param _proposalID proposalId Id that identifies the proposal uniquely
     */
    function invalidateProposal(uint256 _proposalID) external view {
        require(msg.sender == arbitrator, "Only the arbitrator can invalidate");
        Proposal memory proposal = proposals[_proposalID];
        require(proposal.proposalID != 0, "Proposal not found");
        require(proposal.status == Status.OPEN, "Proposal is not valid");
        proposal.status = Status.INVALID;
    }

    /**
     * @dev Returns the token contract address
     * @return address of token contract
     */
    function getTokenAddress() external view returns (address) {
        return address(token);
    }

    /**
     * @dev Returns the required quorum votes
     * @return amount of votes required to execute proposal
     */
    function getQuorum() external view returns (uint256) {
        return quorumVotes;
    }
}
