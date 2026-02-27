# Chainlink Runtime Environment (CRE) Workflow Documentation

## Overview

AssetOracle uses Chainlink Runtime Environment to provide decentralized, tamper-proof property verification through a multi-node consensus mechanism.

## Workflow Architecture
```
User Registers Property
        ↓
Backend API Triggers CRE Workflow
        ↓
┌───────────────────────────────────────┐
│   CHAINLINK DECENTRALIZED NETWORK     │
│                                       │
│  Node 1    Node 2    Node 3    ...   │
│    ↓         ↓         ↓              │
│  Each node independently:             │
│  1. Fetches property data             │
│  2. Runs AI analysis                  │
│  3. Validates information             │
│    ↓         ↓         ↓              │
│  ┌─────────────────────┐             │
│  │  CONSENSUS LAYER    │             │
│  │  (5/5 nodes agree)  │             │
│  └─────────────────────┘             │
└───────────────────────────────────────┘
        ↓
Result Written to Avalanche Blockchain
        ↓
Smart Contract Stores Verification Proof
        ↓
Asset Status: PENDING → VERIFIED
```

## Workflow Steps

### Step 1: Data Aggregation
**What happens:**
- Chainlink DON fetches property data from multiple sources
- Each node independently validates the data
- Sources: Property Registry, Valuation Platform, Risk Assessment

**Code location:** `propertyDataFunction.js`

**Output:** Unified property dataset with ownership, valuation, and risk data

---

### Step 2: AI Analysis
**What happens:**
- Property data sent to AI service
- AI generates risk score, fraud likelihood, investment recommendation
- Multiple nodes verify AI results

**Integration:** Calls Noah's AI service at `localhost:5001/api/score-investment`

**Output:** Investment analysis with risk scoring

---

### Step 3: Consensus Verification
**What happens:**
- Multiple Chainlink nodes compare their results
- Consensus mechanism ensures data integrity
- Only proceeds if majority agreement reached

**Benefit:** Prevents single-point manipulation or fraud

---

### Step 4: Blockchain Storage
**What happens:**
- Verification result encoded for on-chain storage
- Written to Avalanche blockchain via smart contract
- Transaction hash generated as proof

**Contract:** `PropertyVerificationConsumer.sol`

**Output:** Permanent, tamper-proof verification record

---

## Running the Workflow

### Local Testing

**Prerequisites:**
1. Backend API running on port 5000
2. Noah's AI service running on port 5001 (optional - has fallback)

**Run workflow:**
```bash
# Start backend
npm start

# In another terminal, run CRE workflow
node chainlink/run-workflow.js "123 Main Street, San Francisco, CA"
```

**Expected output:**
```
🔗 CHAINLINK RUNTIME ENVIRONMENT (CRE) WORKFLOW
================================================================

📋 Workflow: AssetOracle Property Verification Workflow
🌐 Network: avalanche-fuji
📍 Property: 123 Main Street, San Francisco, CA

🚀 SIMULATING CHAINLINK DON EXECUTION
================================================================

📊 STEP 1: Aggregate Property Data from Multiple Sources
   ✅ Property data aggregated successfully

🤖 STEP 2: AI-Powered Investment Analysis
   ✅ AI Analysis Complete
      - Risk Score: 82/100
      - Fraud Likelihood: LOW
      - Recommendation: STRONG BUY

🔐 STEP 3: Decentralized Consensus Verification
   🔹 Node-1: Data verified ✓
   🔹 Node-2: Data verified ✓
   🔹 Node-3: Data verified ✓
   🔹 Node-4: Data verified ✓
   🔹 Node-5: Data verified ✓
   🔹 Consensus: 5/5 nodes agree
   ✅ Consensus reached across Chainlink DON

⛓️  STEP 4: Prepare Result for Blockchain Storage
   ✅ Result encoded for on-chain storage

✅ WORKFLOW EXECUTION COMPLETE
```

---

## Production Deployment

### Requirements
1. **Avalanche Fuji Testnet Wallet**
   - Get AVAX from faucet: https://core.app/tools/testnet-faucet

2. **LINK Tokens**
   - Get testnet LINK: https://faucets.chain.link/fuji

3. **Chainlink Functions Subscription**
   - Create at: https://functions.chain.link/fuji
   - Fund with LINK tokens

4. **Deploy Smart Contract**
```bash
   # Deploy PropertyVerificationConsumer.sol to Avalanche Fuji
   # Get contract address
```

5. **Request Chainlink API Access**
   - Contact: integrations@chain.link
   - Provide workflow documentation and use case

### Production Configuration

Update `.env`:
```env
CHAINLINK_ROUTER=0xA9d587a00A31A52Ed70D6026794a8FC5E2F5dCb0
CHAINLINK_DON_ID=fun-avalanche-fuji-1
CHAINLINK_SUBSCRIPTION_ID=your_subscription_id
AVALANCHE_WALLET_PRIVATE_KEY=your_private_key
CONTRACT_ADDRESS=deployed_contract_address
```

---

## API Integration

### Trigger CRE Workflow from Backend
```javascript
POST /api/chainlink/request-verification
{
  "propertyAddress": "123 Main Street, San Francisco, CA"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "requestId": "0x19c7efe73fc...",
    "status": "PENDING",
    "estimatedResponseTime": "30-60 seconds"
  }
}
```

### Check Verification Status
```javascript
GET /api/chainlink/verification/:requestId
```

**Response:**
```json
{
  "success": true,
  "data": {
    "requestId": "0x19c7efe73fc...",
    "status": "FULFILLED",
    "result": {
      "estimatedValue": 850000,
      "riskScore": 82,
      "verificationStatus": "VERIFIED"
    },
    "transactionHash": "0xabc123...",
    "blockNumber": 50123456
  }
}
```

---

## Security Features

### 1. Decentralization
- No single point of failure
- Multiple independent nodes verify data
- Consensus prevents manipulation

### 2. Tamper-Proof Storage
- Results stored on Avalanche blockchain
- Immutable audit trail
- Public verification via transaction hash

### 3. Data Integrity
- Document hashing (SHA-256)
- Cryptographic proofs
- Multi-source validation

### 4. Trustless Verification
- Don't need to trust AssetOracle
- Trust the blockchain and Chainlink network
- Transparent verification process

---

## Benefits for AssetOracle

1. **Investor Trust:** Blockchain-verified property data
2. **Fraud Prevention:** Multi-node consensus catches fake documents
3. **Regulatory Compliance:** Permanent audit trails
4. **Institutional Grade:** Enterprise-ready infrastructure
5. **Competitive Edge:** Only RWA platform with CRE integration

---

## Troubleshooting

**Error: "Backend API not running"**
```bash
cd backend
npm start
```

**Error: "AI service unavailable"**
- Workflow continues with fallback analysis
- Optional: Start Noah's AI service on port 5001

**Error: "Cannot find module"**
```bash
npm install
```

---

## Files

- `propertyDataFunction.js` - Chainlink Functions JavaScript source
- `PropertyVerificationConsumer.sol` - Smart contract
- `workflow-config.json` - Workflow configuration
- `run-workflow.js` - Local testing script
- `CRE_WORKFLOW.md` - This documentation

---

## Support

For Chainlink CRE support:
- Documentation: https://docs.chain.link/chainlink-functions
- Discord: https://discord.gg/chainlink
- Contact: integrations@chain.link

---

Built for Chainlink Convergence Hackathon 2026