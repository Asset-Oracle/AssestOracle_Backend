# AssetOracle Backend API

Backend API with Chainlink Runtime Environment (CRE) for decentralized property data aggregation and verification.

## Quick Start

### Prerequisites
- Node.js 18+
- Supabase account

### Installation
```bash
# Clone repo
git clone https://github.com/Asset-Oracle/assestOracle_Backend.git
cd assestOracle_Backend

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Add your Supabase credentials to .env

# Start server
npm start
```

Server runs on `http://localhost:5000`

---

## API Endpoints

### Authentication
- `POST /api/auth/connect-wallet` - Connect wallet
- `GET /api/auth/user/:walletAddress` - Get user profile

### Assets
- `GET /api/assets` - List all assets (marketplace)
- `GET /api/assets/:id` - Get single asset
- `POST /api/assets/register` - Register new asset
- `POST /api/assets/:id/verify` - Verify asset

### User Dashboard
- `GET /api/user/dashboard/:walletAddress` - Get dashboard stats
- `GET /api/user/portfolio/:walletAddress` - Get user portfolio

### Property Analysis
- `POST /api/property/analyze` - Analyze property data

### **Chainlink Runtime Environment (CRE)**
- `POST /api/chainlink/request-verification` - Request property verification via Chainlink Functions
- `GET /api/chainlink/verification/:requestId` - Check verification status
- `GET /api/chainlink/info` - Get CRE integration info

---

## 🔗 Chainlink Integration

### How It Works

1. **Request Verification:**
```bash
   POST /api/chainlink/request-verification
   {
     "propertyAddress": "123 Main St, San Francisco, CA"
   }
```

2. **Chainlink DON Workflow:**
   - Request sent to Chainlink Decentralized Oracle Network
   - DON executes JavaScript function (`chainlink/propertyDataFunction.js`)
   - Function calls AssetOracle API for property data
   - Data aggregated from multiple sources
   - Result returned on-chain via smart contract callback

3. **Check Status:**
```bash
   GET /api/chainlink/verification/:requestId
```

### Architecture
```
User Request → Backend API → Chainlink Functions
                                    ↓
                          DON Executes JS Code
                                    ↓
                        Aggregates Property Data
                                    ↓
                        Returns Result On-Chain
                                    ↓
                    Smart Contract Stores Result
```

### Files

- `chainlink/propertyDataFunction.js` - Chainlink Functions JavaScript source
- `chainlink/PropertyVerificationConsumer.sol` - Smart contract consumer
- `routes/chainlink.js` - CRE API endpoints

---

## Database Schema

### Supabase Tables

**users:**
- `id` (uuid, primary key)
- `wallet_address` (text, unique)
- `name` (text)
- `email` (text)
- `created_at` (timestamp)

**assets:**
- `id` (uuid, primary key)
- `name` (text)
- `description` (text)
- `category` (text)
- `estimated_value` (numeric)
- `location` (jsonb)
- `property_details` (jsonb)
- `images` (jsonb)
- `owner_wallet` (text)
- `verification_status` (text: PENDING, VERIFIED, REJECTED)
- `blockchain_data` (jsonb)
- `ai_analysis` (jsonb)
- `created_at` (timestamp)

---

## Environment Variables
```env
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
PORT=5000
NODE_ENV=development
OPENAI_API_KEY=your_openai_key (for AI integration)
```

---

## 🧪 Testing

### Health Check
```bash
curl http://localhost:5000/api/health
```

### Connect Wallet
```bash
curl -X POST http://localhost:5000/api/auth/connect-wallet \
  -H "Content-Type: application/json" \
  -d '{"walletAddress":"0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb","name":"Test User"}'
```

### Request Chainlink Verification
```bash
curl -X POST http://localhost:5000/api/chainlink/request-verification \
  -H "Content-Type: application/json" \
  -d '{"propertyAddress":"123 Main St, San Francisco, CA"}'
```

---

## Integration Points

### For Frontend (Mavis)
- Base URL: `http://localhost:5000` (or deployed URL)
- All endpoints return JSON with `{success: boolean, data: object}` format
- Use `/api/chainlink/request-verification` for decentralized property verification

### For AI Team (Noah)
- Hook into `/api/property/analyze` endpoint
- Replace mock AI analysis in `routes/property.js` line 60
- Input: aggregated property data
- Output: AI risk score and investment analysis

---

## Deployment

Ready to deploy to Railway, Render, or any Node.js hosting.

---

## Team

**Backend Lead:** Victoria Alayemie  
**Organization:** Asset-Oracle  
**Hackathon:** Chainlink Convergence 2026  

---

## 📄 License

MIT