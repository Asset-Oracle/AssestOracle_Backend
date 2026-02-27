const axios = require('axios');
const express = require('express');
const router = express.Router();

// Mock property data sources
const mockPropertyData = {
  getRegistryData: async (address) => {
    return {
      source: 'Property Registry',
      ownershipHistory: [
        { owner: 'Previous Owner', dateAcquired: '2018-03-15', purchasePrice: 450000 },
        { owner: 'Current Owner', dateAcquired: '2021-06-20', purchasePrice: 520000 }
      ],
      legalStatus: 'Clear Title',
      taxAssessment: 495000
    };
  },

  getValuationData: async (address) => {
    return {
      source: 'Valuation Platform',
      estimatedValue: 565000,
      pricePerSqFt: 285,
      marketTrend: 'RISING',
      appreciation: {
        oneYear: 5.2,
        threeYear: 18.5,
        fiveYear: 32.1
      }
    };
  },

  getRiskData: async (address) => {
    return {
      source: 'Risk Assessment',
      floodRisk: 'LOW',
      crimeRate: 'LOW',
      schoolRating: 8.5,
      walkScore: 72
    };
  }
};

// POST /api/property/analyze
router.post('/analyze', async (req, res) => {
  try {
    const { address, city, state, zipCode } = req.body;

    if (!address) {
      return res.status(400).json({ error: 'Property address is required' });
    }

    const fullAddress = `${address}, ${city}, ${state} ${zipCode}`;

    // Fetch data from sources
    const [registryData, valuationData, riskData] = await Promise.all([
      mockPropertyData.getRegistryData(fullAddress),
      mockPropertyData.getValuationData(fullAddress),
      mockPropertyData.getRiskData(fullAddress)
    ]);

    // Calculate risk score
    const riskScore = 78; // Mock score

    // AI Analysis (Noah will replace this)
    // AI Analysis - Call Noah's AI Service
let aiAnalysis;
try {
  const aiResponse = await axios.post('http://localhost:5001/api/score-investment', {
    property_type: 'Real Estate',
    location: `${city}, ${state}`,
    valuation: valuationData.estimatedValue,
    annual_yield: calculateYield(valuationData.estimatedValue, registryData.taxAssessment),
    market_data: {
      avg_price_per_sqft: valuationData.pricePerSqFt,
      trend: valuationData.marketTrend,
      comparable_sales: `${valuationData.comparables.length} recent sales`
    }
  });

  // Transform Noah's response to our format
  const noahResult = aiResponse.data.data;
  aiAnalysis = {
    riskScore: noahResult.investment_score || 75,
    fraudLikelihood: determineFraudLikelihood(noahResult.risks),
    investmentSummary: noahResult.summary,
    yieldPotential: propertyData.annual_yield || 5.0,
    recommendation: getRecommendation(noahResult.investment_score),
    strengths: noahResult.strengths,
    risks: noahResult.risks,
    opportunities: noahResult.opportunities,
    confidenceLevel: 0.85,
    analyzedAt: new Date().toISOString()
  };

  console.log('AI Analysis received from Noah\'s service');

} catch (error) {
  console.error('AI service unavailable, using fallback:', error.message);
  // Fallback if Noah's service is down
  aiAnalysis = {
    riskScore: riskScore,
    fraudLikelihood: 'MEDIUM',
    investmentSummary: `Property analysis based on available data. Market shows ${valuationData.marketTrend.toLowerCase()} trends.`,
    yieldPotential: 5.0,
    recommendation: 'HOLD',
    confidenceLevel: 0.5,
    analyzedAt: new Date().toISOString()
  };
}

// Helper functions
function calculateYield(value, taxAssessment) {
  const avgRent = value * 0.005; // Assume 0.5% monthly rent
  const annualRent = avgRent * 12;
  return ((annualRent / value) * 100).toFixed(2);
}

function determineFraudLikelihood(risks) {
  if (!risks || risks.length === 0) return 'LOW';
  if (risks.length >= 3) return 'HIGH';
  return 'MEDIUM';
}

function getRecommendation(score) {
  if (score >= 80) return 'STRONG BUY';
  if (score >= 70) return 'BUY';
  if (score >= 50) return 'HOLD';
  return 'AVOID';
}

    res.json({
      success: true,
      data: {
        property: { address: fullAddress },
        ownership: registryData.ownershipHistory,
        valuation: {
          estimated: valuationData.estimatedValue,
          taxAssessed: registryData.taxAssessment,
          trend: valuationData.marketTrend,
          appreciation: valuationData.appreciation
        },
        risk: {
          score: riskScore,
          breakdown: riskData
        },
        aiAnalysis,
        dataSources: [
          registryData.source,
          valuationData.source,
          riskData.source
        ]
      }
    });

  } catch (error) {
    console.error('Error analyzing property:', error);
    res.status(500).json({ error: 'Failed to analyze property' });
  }
});

module.exports = router;