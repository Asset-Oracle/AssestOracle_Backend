const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Load workflow configuration
const config = require('./workflow-config.json');

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function runCREWorkflow(propertyAddress) {
  console.log('\n' + '='.repeat(70));
  log(' CHAINLINK RUNTIME ENVIRONMENT (CRE) WORKFLOW', 'bright');
  console.log('='.repeat(70));
  
  log(`\n Workflow: ${config.name}`, 'cyan');
  log(` Network: ${config.network}`, 'cyan');
  log(` Property: ${propertyAddress}`, 'cyan');
  log(` Chainlink Router: ${config.chainlink.router}`, 'cyan');
  log(` DON ID: ${config.chainlink.donId}`, 'cyan');

  console.log('\n' + '='.repeat(70));
  log(' SIMULATING CHAINLINK DON EXECUTION', 'bright');
  console.log('='.repeat(70) + '\n');

  try {
    // STEP 1: Aggregate Property Data
    log(' STEP 1: Aggregate Property Data from Multiple Sources', 'blue');
    log('   Fetching from: Property Registry, Valuation Platform, Risk Assessment', 'yellow');
    
    const [street, city, state] = parseAddress(propertyAddress);
    
    const propertyDataResponse = await axios.post(
      'http://localhost:5000/api/property/analyze',
      {
        address: street,
        city: city,
        state: state
      }
    );

    const propertyData = propertyDataResponse.data.data;
    log('    Property data aggregated successfully\n', 'green');

    // STEP 2: AI Analysis
    log(' STEP 2: AI-Powered Investment Analysis', 'blue');
    log('   Analyzing risk, fraud likelihood, and investment potential...', 'yellow');
    
    const aiAnalysis = propertyData.aiAnalysis;
    log(`    AI Analysis Complete`, 'green');
    log(`      - Risk Score: ${aiAnalysis.riskScore}/100`, 'cyan');
    log(`      - Fraud Likelihood: ${aiAnalysis.fraudLikelihood}`, 'cyan');
    log(`      - Recommendation: ${aiAnalysis.recommendation}\n`, 'cyan');

    // STEP 3: Consensus Verification (Simulated DON)
    log(' STEP 3: Decentralized Consensus Verification', 'blue');
    log('   Multiple Chainlink nodes reaching consensus...', 'yellow');
    
    await simulateConsensus();
    
    log('    Consensus reached across Chainlink DON\n', 'green');

    // STEP 4: Prepare On-Chain Result
    log('  STEP 4: Prepare Result for Blockchain Storage', 'blue');
    log('   Encoding verification result...', 'yellow');

    const verificationResult = {
      propertyAddress: propertyAddress,
      estimatedValue: propertyData.valuation.estimated,
      riskScore: aiAnalysis.riskScore,
      fraudLikelihood: aiAnalysis.fraudLikelihood,
      verificationStatus: aiAnalysis.riskScore >= 70 ? 'VERIFIED' : 'NEEDS_REVIEW',
      recommendation: aiAnalysis.recommendation,
      timestamp: Math.floor(Date.now() / 1000),
      dataSourcesVerified: config.data_sources.length,
      chainlinkDON: config.chainlink.donId
    };

    const encodedResult = JSON.stringify(verificationResult);
    log('   Result encoded for on-chain storage\n', 'green');

    // Display Results
    console.log('='.repeat(70));
    log(' WORKFLOW EXECUTION COMPLETE', 'bright');
    console.log('='.repeat(70) + '\n');

    log(' VERIFICATION RESULT:', 'bright');
    console.log(JSON.stringify(verificationResult, null, 2));

    console.log('\n' + '='.repeat(70));
    log(' CHAINLINK CRE WORKFLOW SUMMARY', 'bright');
    console.log('='.repeat(70));
    
    log('\n In Production, this workflow would:', 'yellow');
    log('   1. Execute across multiple Chainlink nodes simultaneously', 'cyan');
    log('   2. Each node independently fetches and validates data', 'cyan');
    log('   3. Nodes reach consensus on the verification result', 'cyan');
    log('   4. Result is written to Avalanche blockchain', 'cyan');
    log('   5. Smart contract stores permanent verification proof', 'cyan');
    log('   6. Transaction hash returned as verification ID\n', 'cyan');

    log('Workflow Metrics:', 'yellow');
    log(`   • Data Sources Verified: ${config.data_sources.length}`, 'cyan');
    log(`   • Network: ${config.network}`, 'cyan');
    log(`   • Gas Limit: ${config.chainlink.gasLimit}`, 'cyan');
    log(`   • DON ID: ${config.chainlink.donId}\n`, 'cyan');

    console.log('='.repeat(70) + '\n');

    return verificationResult;

  } catch (error) {
    log(`\n  Workflow execution failed: ${error.message}`, 'yellow');
    
    if (error.code === 'ECONNREFUSED') {
      log('\n  Backend API not running. Please start it first:', 'yellow');
      log('   cd backend && npm start\n', 'cyan');
    }
    
    throw error;
  }
}

function parseAddress(address) {
  const parts = address.split(',').map(p => p.trim());
  return [
    parts[0] || '123 Main St',
    parts[1] || 'San Francisco',
    parts[2] || 'CA'
  ];
}

async function simulateConsensus() {
  const nodes = ['Node-1', 'Node-2', 'Node-3', 'Node-4', 'Node-5'];
  
  for (let i = 0; i < nodes.length; i++) {
    await new Promise(resolve => setTimeout(resolve, 300));
    log(`   🔹 ${nodes[i]}: Data verified ✓`, 'cyan');
  }
  
  await new Promise(resolve => setTimeout(resolve, 500));
  log('   🔹 Consensus: 5/5 nodes agree', 'green');
}

// CLI execution
if (require.main === module) {
  const propertyAddress = process.argv[2] || '123 Main Street, San Francisco, CA';
  
  runCREWorkflow(propertyAddress)
    .then(() => {
      log('CRE Workflow completed successfully\n', 'green');
      process.exit(0);
    })
    .catch(error => {
      log(`CRE Workflow failed: ${error.message}\n`, 'yellow');
      process.exit(1);
    });
}

module.exports = { runCREWorkflow };