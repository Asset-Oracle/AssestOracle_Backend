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
    const aiAnalysis = {
      riskScore,
      fraudLikelihood: 'LOW',
      investmentSummary: `This property shows ${valuationData.marketTrend.toLowerCase()} market trends. The estimated value of $${valuationData.estimatedValue.toLocaleString()} is consistent with tax assessments.`,
      yieldPotential: 7.5,
      recommendation: 'STRONG BUY',
      confidenceLevel: 0.85
    };

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