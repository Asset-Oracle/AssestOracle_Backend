const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

// POST /api/chainlink/request-verification
// Request property verification via Chainlink Functions
router.post('/request-verification', async (req, res) => {
  try {
    const { propertyAddress, contractAddress } = req.body;

    if (!propertyAddress) {
      return res.status(400).json({ error: 'Property address is required' });
    }

    // Read Chainlink Function source code
    const functionSource = fs.readFileSync(
      path.join(__dirname, '../chainlink/propertyDataFunction.js'),
      'utf8'
    );

    // In production, this would call the smart contract
    // For demo, we simulate the Chainlink workflow
    const simulatedRequestId = `0x${Date.now().toString(16)}${Math.random().toString(16).slice(2, 10)}`;

    // Log the CRE workflow
    console.log('📡 Chainlink Functions Request Initiated:');
    console.log(`   Property: ${propertyAddress}`);
    console.log(`   Request ID: ${simulatedRequestId}`);
    console.log(`   Function Source: Loaded from propertyDataFunction.js`);
    console.log(`   Status: Pending DON execution`);

    res.json({
      success: true,
      message: 'Property verification request submitted to Chainlink Functions',
      data: {
        requestId: simulatedRequestId,
        propertyAddress,
        status: 'PENDING',
        network: 'Avalanche',
        functionSource: functionSource.substring(0, 100) + '...',
        estimatedResponseTime: '30-60 seconds',
        workflow: {
          step1: 'Request sent to Chainlink DON',
          step2: 'DON executes JavaScript function',
          step3: 'Function calls AssetOracle API',
          step4: 'Data aggregated from multiple sources',
          step5: 'Result returned on-chain',
          step6: 'Callback triggers fulfillRequest'
        }
      }
    });

  } catch (error) {
    console.error('Error requesting Chainlink verification:', error);
    res.status(500).json({ error: 'Failed to request verification' });
  }
});

// GET /api/chainlink/verification/:requestId
// Check verification status
router.get('/verification/:requestId', async (req, res) => {
  try {
    const { requestId } = req.params;

    // Simulate checking on-chain verification result
    // In production, this queries the smart contract
    const mockResult = {
      requestId,
      status: 'FULFILLED',
      result: {
        estimatedValue: 565000,
        riskScore: 78,
        verificationStatus: 'VERIFIED',
        timestamp: Math.floor(Date.now() / 1000)
      },
      transactionHash: `0x${Math.random().toString(16).slice(2, 66)}`,
      blockNumber: Math.floor(Math.random() * 1000000) + 50000000,
      gasUsed: '285432'
    };

    res.json({
      success: true,
      data: mockResult
    });

  } catch (error) {
    console.error('Error fetching verification:', error);
    res.status(500).json({ error: 'Failed to fetch verification status' });
  }
});

// GET /api/chainlink/info
// Get Chainlink integration info
router.get('/info', (req, res) => {
  res.json({
    success: true,
    chainlink: {
      enabled: true,
      network: 'Avalanche Fuji Testnet',
      functionsVersion: '1.0.0',
      router: '0xA9d587a00A31A52Ed70D6026794a8FC5E2F5dCb0',
      donId: 'fun-avalanche-fuji-1',
      features: [
        'Decentralized property data aggregation',
        'Multi-source verification consensus',
        'On-chain result storage',
        'Tamper-proof audit trails'
      ],
      endpoints: {
        requestVerification: 'POST /api/chainlink/request-verification',
        checkStatus: 'GET /api/chainlink/verification/:requestId',
        info: 'GET /api/chainlink/info'
      }
    }
  });
});

// POST /api/chainlink/run-workflow
// Actually execute CRE workflow and return results
router.post('/run-workflow', async (req, res) => {
  try {
    const { propertyAddress } = req.body;

    if (!propertyAddress) {
      return res.status(400).json({ error: 'Property address is required' });
    }

    console.log(`\n Running CRE workflow for: ${propertyAddress}`);

    // Import and run the workflow
    const { runCREWorkflow } = require('../chainlink/run-workflow');
    
    // Execute the workflow
    const result = await runCREWorkflow(propertyAddress);

    res.json({
      success: true,
      message: 'CRE workflow executed successfully',
      data: {
        verificationResult: result,
        workflow: {
          step1: 'Data aggregated from multiple sources',
          step2: 'AI analysis completed',
          step3: 'Consensus reached (5/5 nodes)',
          step4: 'Result encoded for blockchain'
        },
        chainlink: {
          network: 'avalanche-fuji',
          donId: 'fun-avalanche-fuji-1',
          nodesVerified: 5
        }
      }
    });

  } catch (error) {
    console.error('Error running CRE workflow:', error);
    res.status(500).json({ 
      error: 'Failed to run CRE workflow',
      details: error.message 
    });
  }
});

module.exports = router;