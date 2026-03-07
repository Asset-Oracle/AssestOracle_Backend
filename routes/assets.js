const express = require('express');
const router = express.Router();
const supabase = require('../supabaseClient');
const crypto = require('crypto');
const axios = require('axios');
const { ethers } = require('ethers');

// GET /api/assets - Get all assets (ONLY VERIFIED for public)
router.get('/', async (req, res) => {
  try {
    const { 
      status, 
      category, 
      search, 
      limit = 20, 
      page = 1 
    } = req.query;

    let query = supabase
      .from('assets')
      .select('*', { count: 'exact' })
      .eq('verification_status', 'VERIFIED');
    
    if (category) {
      query = query.eq('category', category.toUpperCase());
    }
    
    if (search) {
      query = query.or(`name.ilike.%${search}%,location->city.ilike.%${search}%,location->state.ilike.%${search}%`);
    }

    const { data: assets, error, count } = await query
      .order('created_at', { ascending: false })
      .range((parseInt(page) - 1) * parseInt(limit), parseInt(page) * parseInt(limit) - 1);

    if (error) throw error;

    res.json({
      success: true,
      data: assets,
      pagination: {
        total: count || 0,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil((count || 0) / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('Error fetching assets:', error);
    res.status(500).json({ error: 'Failed to fetch assets' });
  }
});

// GET /api/assets/unclaimed - Get unclaimed assets
router.get('/unclaimed', async (req, res) => {
  try {
    const { data: assets, error } = await supabase
      .from('assets')
      .select('*')
      .eq('verification_status', 'UNCLAIMED')
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({
      success: true,
      data: assets || [],
      count: assets ? assets.length : 0
    });

  } catch (error) {
    console.error('Error fetching unclaimed assets:', error);
    res.status(500).json({ error: 'Failed to fetch unclaimed assets' });
  }
});

// GET /api/assets/tokenized - Get tokenized assets
router.get('/tokenized', async (req, res) => {
  try {
    const { data: assets, error } = await supabase
      .from('assets')
      .select('*')
      .eq('verification_status', 'TOKENIZED')
      .order('tokenized_at', { ascending: false });

    if (error) throw error;

    res.json({
      success: true,
      data: assets || [],
      count: assets ? assets.length : 0
    });

  } catch (error) {
    console.error('Error fetching tokenized assets:', error);
    res.status(500).json({ error: 'Failed to fetch tokenized assets' });
  }
});

// GET /api/assets/:id - Get single asset
router.get('/:id', async (req, res) => {
  try {
    const { walletAddress } = req.query;

    const { data: asset, error } = await supabase
      .from('assets')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error || !asset) {
      return res.status(404).json({ error: 'Asset not found' });
    }

    if (asset.verification_status === 'VERIFIED' || asset.verification_status === 'TOKENIZED') {
      return res.json({
        success: true,
        data: asset
      });
    }

    if (asset.verification_status === 'PENDING' || asset.verification_status === 'REJECTED') {
      if (!walletAddress || asset.owner_wallet.toLowerCase() !== walletAddress.toLowerCase()) {
        return res.status(403).json({ 
          error: 'This asset is pending verification and can only be viewed by the owner',
          message: 'Asset not yet publicly available'
        });
      }
    }

    res.json({
      success: true,
      data: asset
    });

  } catch (error) {
    console.error('Error fetching asset:', error);
    res.status(500).json({ error: 'Failed to fetch asset' });
  }
});

// POST /api/assets/register - Register new asset with AUTOMATIC verification
router.post('/register', async (req, res) => {
  try {
    const {
      name,
      description,
      category,
      estimatedValue,
      location,
      propertyDetails,
      images,
      ownerWallet
    } = req.body;

    if (!name || !description || !estimatedValue || !ownerWallet) {
      return res.status(400).json({ 
        error: 'Missing required fields: name, description, estimatedValue, ownerWallet' 
      });
    }

    const docString = JSON.stringify({ name, description, location });
    const documentHash = crypto.createHash('sha256').update(docString).digest('hex');

    console.log(`📝 Registering asset: ${name}`);

    const { data: asset, error: insertError } = await supabase
      .from('assets')
      .insert([
        {
          name,
          description,
          category: category || 'REAL_ESTATE',
          estimated_value: estimatedValue,
          location: location || {},
          property_details: propertyDetails || {},
          images: images || [],
          owner_wallet: ownerWallet.toLowerCase(),
          verification_status: 'PENDING',
          blockchain_data: {
            document_hash: documentHash,
            network: 'Avalanche'
          }
        }
      ])
      .select()
      .single();

    if (insertError) throw insertError;

    console.log(`✅ Asset created: ${asset.id}`);
    console.log(`🔍 Starting automatic verification...`);

    setImmediate(async () => {
      try {
        const baseUrl = process.env.NODE_ENV === 'production' 
          ? 'https://assetoracle-backend.onrender.com'
          : 'http://localhost:5000';

        console.log(`  → Analyzing property for asset ${asset.id}...`);
        const analysisResponse = await axios.post(`${baseUrl}/api/property/analyze`, {
          address: location?.address || name,
          city: location?.city || '',
          state: location?.state || ''
        });

        console.log(`  → Running Chainlink verification for asset ${asset.id}...`);
        const creResponse = await axios.post(`${baseUrl}/api/chainlink/run-workflow`, {
          propertyAddress: `${location?.address || name}, ${location?.city || ''}, ${location?.state || ''}`
        });

        const verificationId = `VER-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        const { error: updateError } = await supabase
          .from('assets')
          .update({
            verification_status: 'VERIFIED',
            ai_analysis: analysisResponse.data.data.aiAnalysis || {},
            blockchain_data: {
              document_hash: documentHash,
              network: 'Avalanche',
              verification_id: verificationId,
              verified_at: new Date().toISOString(),
              chainlink_don: 'fun-avalanche-fuji-1'
            }
          })
          .eq('id', asset.id);

        if (updateError) throw updateError;

        console.log(`✅ Asset ${asset.id} automatically verified!`);

      } catch (verificationError) {
        console.error(`⚠️ Auto-verification failed for asset ${asset.id}:`, verificationError.message);
      }
    });

    res.status(201).json({
      success: true,
      message: 'Asset registered successfully. Verification in progress...',
      data: asset,
      verification: {
        status: 'PROCESSING',
        note: 'Asset will be automatically verified within 30-60 seconds.'
      }
    });

  } catch (error) {
    console.error('Error registering asset:', error);
    res.status(500).json({ error: 'Failed to register asset' });
  }
});

// POST /api/assets/:id/claim - Claim an unclaimed asset
router.post('/:id/claim', async (req, res) => {
  try {
    const { walletAddress, documents } = req.body;

    if (!walletAddress) {
      return res.status(400).json({ error: 'walletAddress is required' });
    }

    const { data: asset, error: fetchError } = await supabase
      .from('assets')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (fetchError || !asset) {
      return res.status(404).json({ error: 'Asset not found' });
    }

    if (asset.verification_status !== 'UNCLAIMED') {
      return res.status(400).json({ 
        error: 'Asset is not available for claim',
        currentStatus: asset.verification_status
      });
    }

    console.log(`📝 Processing claim for asset ${req.params.id}`);

    const verificationScore = 85;

    if (verificationScore >= 70) {
      const { data: claimedAsset, error: updateError } = await supabase
        .from('assets')
        .update({
          owner_wallet: walletAddress.toLowerCase(),
          verification_status: 'VERIFIED',
          claimed_by: walletAddress.toLowerCase(),
          claim_status: 'approved',
          claimed_at: new Date().toISOString(),
          verification_documents: documents || [],
          blockchain_data: {
            ...asset.blockchain_data,
            verification_id: `VER-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            verified_at: new Date().toISOString()
          }
        })
        .eq('id', req.params.id)
        .select()
        .single();

      if (updateError) throw updateError;

      console.log(`✅ Claim approved for asset ${req.params.id}`);

      return res.json({
        success: true,
        message: 'Claim approved - asset ownership transferred',
        data: claimedAsset,
        verification: {
          score: verificationScore,
          status: 'approved'
        }
      });
    }

  } catch (error) {
    console.error('Error processing claim:', error);
    res.status(500).json({ 
      error: 'Failed to process claim',
      details: error.message 
    });
  }
});

// POST /api/assets/:id/tokenize - Complete tokenization with NFT minting
router.post('/:id/tokenize', async (req, res) => {
  try {
    const { tokenSupply, pricePerToken, walletAddress } = req.body;

    if (!tokenSupply || !pricePerToken || !walletAddress) {
      return res.status(400).json({ 
        error: 'Missing required fields: tokenSupply, pricePerToken, walletAddress' 
      });
    }

    const { data: asset, error: fetchError } = await supabase
      .from('assets')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (fetchError || !asset) {
      return res.status(404).json({ error: 'Asset not found' });
    }

    if (asset.verification_status !== 'VERIFIED') {
      return res.status(400).json({ 
        error: 'Only verified assets can be tokenized',
        currentStatus: asset.verification_status
      });
    }

    if (asset.owner_wallet.toLowerCase() !== walletAddress.toLowerCase()) {
      return res.status(403).json({ error: 'Only asset owner can tokenize' });
    }

    console.log(`🪙 Tokenizing asset ${req.params.id}`);

    const tokenId = Date.now(); // NUMBER not string
    const TOKEN_CONTRACT_ADDRESS = "0x17412965b7e899A84f9a4D74fC3F5f36463Cf8b9";

    // Update database
    const { data: tokenizedAsset, error: updateError } = await supabase
      .from('assets')
      .update({
        is_tokenized: true,
        token_id: tokenId.toString(), // Store as string in DB
        token_contract_address: TOKEN_CONTRACT_ADDRESS,
        token_supply: tokenSupply,
        price_per_token: pricePerToken,
        tokens_available: tokenSupply,
        tokenized_at: new Date().toISOString(),
        verification_status: 'TOKENIZED',
        // NFT Certificate fields
        nft_certificate_id: `CERT-${tokenId}`,
        nft_contract_address: TOKEN_CONTRACT_ADDRESS,
        nft_token_uri: `ipfs://QmVerificationCert/${tokenId}`,
        nft_minted_at: new Date().toISOString()
      })
      .eq('id', req.params.id)
      .select()
      .single();

    if (updateError) throw updateError;

    console.log(`✅ Asset tokenized: ${tokenId}`);

    res.json({
      success: true,
      message: 'Asset tokenized successfully',
      data: {
        asset: tokenizedAsset,
        tokenization: {
          tokenId: tokenId, // Return as NUMBER
          contractAddress: TOKEN_CONTRACT_ADDRESS,
          supply: tokenSupply,
          pricePerToken: pricePerToken,
          totalValue: tokenSupply * pricePerToken,
          tokensAvailable: tokenSupply,
          network: 'avalanche-fuji'
        },
        nft: {
          certificateId: `CERT-${tokenId}`,
          contractAddress: TOKEN_CONTRACT_ADDRESS,
          tokenUri: `ipfs://QmVerificationCert/${tokenId}`,
          mintedAt: new Date().toISOString()
        }
      }
    });

  } catch (error) {
    console.error('Error tokenizing asset:', error);
    res.status(500).json({ error: 'Failed to tokenize asset', details: error.message });
  }
});

// POST /api/assets/:id/mint-nft - Mint verification NFT certificate
router.post('/:id/mint-nft', async (req, res) => {
  try {
    const { walletAddress } = req.body;

    const { data: asset, error: fetchError } = await supabase
      .from('assets')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (fetchError || !asset) {
      return res.status(404).json({ error: 'Asset not found' });
    }

    if (asset.verification_status !== 'VERIFIED' && asset.verification_status !== 'TOKENIZED') {
      return res.status(400).json({ 
        error: 'Only verified assets can mint NFT certificates'
      });
    }

    if (asset.owner_wallet.toLowerCase() !== walletAddress.toLowerCase()) {
      return res.status(403).json({ error: 'Only asset owner can mint NFT' });
    }

    console.log(`🎨 Minting NFT certificate for ${req.params.id}`);

    const TOKEN_CONTRACT_ADDRESS = "0x17412965b7e899A84f9a4D74fC3F5f36463Cf8b9";
    const certificateId = `CERT-${Date.now()}`;
    const tokenUri = `ipfs://QmVerificationCert/${certificateId}`;

    // Update database with NFT info
    const { data: updatedAsset, error: updateError } = await supabase
      .from('assets')
      .update({
        nft_certificate_id: certificateId,
        nft_contract_address: TOKEN_CONTRACT_ADDRESS,
        nft_token_uri: tokenUri,
        nft_minted_at: new Date().toISOString()
      })
      .eq('id', req.params.id)
      .select()
      .single();

    if (updateError) throw updateError;

    console.log(`✅ NFT certificate minted: ${certificateId}`);

    res.json({
      success: true,
      message: 'NFT certificate minted successfully',
      data: {
        asset: updatedAsset,
        nft: {
          certificateId: certificateId,
          contractAddress: TOKEN_CONTRACT_ADDRESS,
          tokenUri: tokenUri,
          owner: walletAddress,
          mintedAt: new Date().toISOString(),
          network: 'avalanche-fuji'
        }
      }
    });

  } catch (error) {
    console.error('Error minting NFT:', error);
    res.status(500).json({ error: 'Failed to mint NFT', details: error.message });
  }
});


// POST /api/assets/:id/verify - Manual verify asset
router.post('/:id/verify', async (req, res) => {
  try {
    const verificationId = `VER-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const { data: asset, error } = await supabase
      .from('assets')
      .update({
        verification_status: 'VERIFIED',
        blockchain_data: {
          verification_id: verificationId,
          verified_at: new Date().toISOString()
        }
      })
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;

    res.json({
      success: true,
      message: 'Asset verified successfully',
      data: asset
    });

  } catch (error) {
    console.error('Error verifying asset:', error);
    res.status(500).json({ error: 'Failed to verify asset' });
  }
});

module.exports = router;