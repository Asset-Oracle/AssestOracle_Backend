const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Import routes
// Import Routes
const authRoutes = require('./routes/auth');
const assetRoutes = require('./routes/assets');
const userRoutes = require('./routes/user');
const propertyRoutes = require('./routes/property');
const chainlinkRoutes = require('./routes/chainlink');
// Use routes
// Use routes
app.use('/api/auth', authRoutes);
app.use('/api/assets', assetRoutes);
app.use('/api/user', userRoutes);
app.use('/api/property', propertyRoutes);
app.use('/api/chainlink', chainlinkRoutes);

// Root route - API information
app.get('/', (req, res) => {
  res.json({
    name: 'AssetOracle Backend API',
    status: ' Operational',
    version: '1.0.0',
    description: 'RWA Infrastructure with Chainlink Runtime Environment',
    documentation: 'https://github.com/Asset-Oracle/AssestOracle_Backend',
    production: {
      url: 'https://assetoracle-backend.onrender.com',
      deployed: true
    },
    features: [
      'Wallet Authentication',
      'Asset Registration & Verification',
      'Chainlink CRE Integration',
      'AI-Powered Investment Analysis',
      'Decentralized Property Verification'
    ],
    endpoints: {
      health: '/api/health',
      authentication: {
        connectWallet: 'POST /api/auth/connect-wallet',
        getUser: 'GET /api/auth/user/:walletAddress'
      },
      assets: {
        marketplace: 'GET /api/assets',
        single: 'GET /api/assets/:id',
        register: 'POST /api/assets/register',
        verify: 'POST /api/assets/:id/verify'
      },
      user: {
        dashboard: 'GET /api/user/dashboard/:walletAddress',
        portfolio: 'GET /api/user/portfolio/:walletAddress'
      },
      chainlink: {
        info: 'GET /api/chainlink/info',
        runWorkflow: 'POST /api/chainlink/run-workflow',
        requestVerification: 'POST /api/chainlink/request-verification',
        checkStatus: 'GET /api/chainlink/verification/:requestId'
      },
      property: {
        analyze: 'POST /api/property/analyze'
      }
    },
    chainlink: {
      enabled: true,
      network: 'Avalanche Fuji',
      donId: 'fun-avalanche-fuji-1'
    }
  });
});
// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'AssetOracle API is running',
    timestamp: new Date().toISOString()
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`AssetOracle API running on port ${PORT}`);
});