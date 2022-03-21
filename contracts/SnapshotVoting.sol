//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "usingtellor/contracts/UsingTellor.sol";
import "./MyToken.sol";

/**
 @author Tellor Inc.
 @title SnapshotVoting
 @dev This is the SnapshotVoting contract which defines the functionality for
 * using Tellor to verify snapshot vote results.
 * This sample contract mints 1000 tokens to a target address when the off-chain proposal passes.
*/
contract SnapshotVoting is UsingTellor {
    // Events
    event ProposalCreated(
        address indexed _snapshotVotingAddress,
        string proposalID
    );
    event ProposalExecuted(
        address indexed _snapshotVotingAddress,
        string proposalID
    );

    // Storage
    address private arbitrator;

    mapping(string => Proposal) public proposals;

    uint256 private quorumVotes;

    MyToken private token;

    // Enums
    enum Status {
        OPEN,
        CLOSED,
        INVALID
    }

    // Structs
    struct Proposal {
        string description;
        uint256 noVotes;
        string proposalID;
        uint256 yesVotes;
        address target;
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
     * @dev Marks a proposal as invalid
     * @param _proposalID proposalId Id that identifies the proposal uniquely
     * @notice This function is only callable by the arbitrator
     */
    function invalidateProposal(string memory _proposalID) external {
        require(msg.sender == arbitrator, "Only the arbitrator can invalidate");
        Proposal memory proposal = proposals[_proposalID];
        require(bytes(proposal.proposalID).length != 0, "Proposal not found");
        require(proposal.status == Status.OPEN, "Proposal is not valid");
        proposals[_proposalID].status = Status.INVALID;
    }

    /**
     * @dev Execute a passed proposal
     * @param _proposalID proposalId Id that identifies the proposal uniquely
     */
    function executeProposal(string memory _proposalID) external {
        Proposal memory proposal = proposals[_proposalID];
        require(bytes(proposal.proposalID).length != 0, "Proposal not found");
        require(proposal.status == Status.OPEN, "Proposal is not valid");
        bytes32 _queryID = keccak256(
            abi.encode("Snapshot", abi.encode(_proposalID))
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
     * @dev Create a proposal
     * @param _target address of the proposal
     * @param _proposalId proposalId Id that identifies the proposal uniquely
     */
    function proposeVote(address _target, string memory _proposalId) external {
        require(
            bytes(proposals[_proposalId].proposalID).length == 0,
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

    /**
     * @dev Returns the proposal Status
     * @param _proposalId proposalId Id that identifies the proposal uniquely
     * @return status of the proposal
     */
    function getStatus(string memory _proposalId) external view returns (Status) {
        return proposals[_proposalId].status;
    }

    /**
     * @dev Returns the proposal votes
     * @param _proposalId proposalId Id that identifies the proposal uniquely
     * @return yes and no votes count
     */
    function getVotes(string memory _proposalId)
        external
        view
        returns (uint256, uint256)
    {
        return (
            proposals[_proposalId].yesVotes,
            proposals[_proposalId].noVotes
        );
    }
}
