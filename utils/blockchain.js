const { ethers } = require('ethers');

const TOKEN_CREATOR_ABI = [
  "function mint(address assetOwner, uint256 amount, uint256 _nonce, uint256 deadline, bytes calldata owner_signature, bytes calldata user_signature) external",
  "function nonce() public view returns (uint256)",
  "function balanceOf(address account) public view returns (uint256)"
];

const TOKEN_CONTRACT_ADDRESS = '0x5FC8d32690cc91D4c39d9d3abcBD16989F875707';
const SEPOLIA_RPC_URL = process.env.SEPOLIA_RPC_URL || 'https://rpc.sepolia.org';
const BACKEND_PRIVATE_KEY = process.env.BACKEND_PRIVATE_KEY;

async function generateBackendSignature(assetOwner, amount, nonce, deadline, contractAddress) {
  try {
    if (!BACKEND_PRIVATE_KEY) {
      throw new Error('BACKEND_PRIVATE_KEY not configured');
    }
    const wallet = new ethers.Wallet(BACKEND_PRIVATE_KEY);
    const messageHash = ethers.utils.solidityKeccak256(
      ['address', 'uint256', 'uint256', 'uint256', 'address'],
      [assetOwner, amount, nonce, deadline, contractAddress.toLowerCase()]
    );
    const signature = await wallet.signMessage(ethers.utils.arrayify(messageHash));
    return signature;
  } catch (error) {
    console.error('Error generating backend signature:', error);
    throw error;
  }
}

async function getContractNonce() {
  try {
    const provider = new ethers.providers.JsonRpcProvider(SEPOLIA_RPC_URL);
    const contract = new ethers.Contract(TOKEN_CONTRACT_ADDRESS, TOKEN_CREATOR_ABI, provider);
    const nonce = await contract.nonce();
    return nonce.toNumber();
  } catch (error) {
    console.error('Error getting contract nonce:', error);
    throw error;
  }
}

async function deployTokenContract(assetName, symbol) {
  try {
    const mockAddress = `0x${Math.random().toString(16).substr(2, 40)}`;
    return {
      contractAddress: mockAddress,
      tokenName: assetName,
      symbol: symbol,
      deployed: false,
      network: 'sepolia'
    };
  } catch (error) {
    console.error('Error deploying token contract:', error);
    throw error;
  }
}

module.exports = {
  generateBackendSignature,
  getContractNonce,
  deployTokenContract,
  TOKEN_CONTRACT_ADDRESS,
  TOKEN_CREATOR_ABI,
  SEPOLIA_RPC_URL
};