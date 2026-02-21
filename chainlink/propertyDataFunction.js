// Chainlink Functions JavaScript code
// This runs in the Chainlink decentralized oracle network

// Property data aggregation function
const propertyAddress = args[0]; // e.g., "123 Main St, San Francisco, CA"

// Source 1: Property Registry API
const registryResponse = await Functions.makeHttpRequest({
  url: `https://api.assetoracle.com/property/analyze`,
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  data: {
    address: propertyAddress
  }
});

if (registryResponse.error) {
  throw Error("Registry API request failed");
}

const propertyData = registryResponse.data;

// Return aggregated data as bytes
const result = {
  estimatedValue: propertyData.valuation.estimated,
  riskScore: propertyData.aiAnalysis.riskScore,
  verificationStatus: propertyData.property.address ? "VERIFIED" : "FAILED",
  timestamp: Math.floor(Date.now() / 1000)
};

// Encode result for on-chain consumption
return Functions.encodeString(JSON.stringify(result));