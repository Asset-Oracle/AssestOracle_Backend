// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {FunctionsClient} from "@chainlink/contracts/src/v0.8/functions/v1_0_0/FunctionsClient.sol";
import {FunctionsRequest} from "@chainlink/contracts/src/v0.8/functions/v1_0_0/libraries/FunctionsRequest.sol";

/**
 * @title PropertyVerificationConsumer
 * @notice Chainlink Functions consumer for AssetOracle property verification
 */
contract PropertyVerificationConsumer is FunctionsClient {
    using FunctionsRequest for FunctionsRequest.Request;

    // Events
    event PropertyVerificationRequested(bytes32 indexed requestId, string propertyAddress);
    event PropertyVerificationFulfilled(bytes32 indexed requestId, bytes response);

    // State variables
    bytes32 public donId;
    uint64 public subscriptionId;
    uint32 public gasLimit = 300000;
    
    mapping(bytes32 => string) public propertyRequests;
    mapping(bytes32 => bytes) public verificationResults;

    constructor(
        address router,
        bytes32 _donId,
        uint64 _subscriptionId
    ) FunctionsClient(router) {
        donId = _donId;
        subscriptionId = _subscriptionId;
    }

    /**
     * @notice Request property verification via Chainlink Functions
     * @param propertyAddress The property address to verify
     * @param source JavaScript source code (from propertyDataFunction.js)
     */
    function requestPropertyVerification(
        string memory propertyAddress,
        string memory source
    ) external returns (bytes32 requestId) {
        FunctionsRequest.Request memory req;
        req.initializeRequest(
            FunctionsRequest.Location.Inline,
            FunctionsRequest.CodeLanguage.JavaScript,
            source
        );

        // Set property address as argument
        string[] memory args = new string[](1);
        args[0] = propertyAddress;
        req.setArgs(args);

        // Send request
        requestId = _sendRequest(
            req.encodeCBOR(),
            subscriptionId,
            gasLimit,
            donId
        );

        propertyRequests[requestId] = propertyAddress;
        emit PropertyVerificationRequested(requestId, propertyAddress);

        return requestId;
    }

    /**
     * @notice Callback function for Chainlink Functions
     */
    function fulfillRequest(
        bytes32 requestId,
        bytes memory response,
        bytes memory err
    ) internal override {
        if (err.length > 0) {
            // Handle error
            return;
        }

        verificationResults[requestId] = response;
        emit PropertyVerificationFulfilled(requestId, response);
    }

    /**
     * @notice Get verification result for a request
     */
    function getVerificationResult(bytes32 requestId) 
        external 
        view 
        returns (string memory propertyAddress, bytes memory result) 
    {
        return (propertyRequests[requestId], verificationResults[requestId]);
    }
}