const express = require('express');
const router = express.Router();
const supabase = require('../supabaseClient');
const crypto = require('crypto');
const axios = require('axios');

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

    // IMPORTANT: Default to VERIFIED only for public marketplace
    // Users can only see PENDING/REJECTED assets in their own portfolio
    let query = supabase
      .from('assets')
      .select('*', { count: 'exact' })
      .eq('verification_status', 'VERIFIED');  // Force VERIFIED only
    
    // Allow filtering by category
    if (category) {
      query = query.eq('category', category.toUpperCase());
    }
    
    // Allow search
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

// GET /api/assets/unclaimed - Get unclaimed assets (MUST BE BEFORE /:id)
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

// GET /api/assets/:id - Get single asset (VERIFIED = public, PENDING = owner only)
router.get('/:id', async (req, res) => {
  try {
    const { walletAddress } = req.query; // Optional wallet address to check ownership

    const { data: asset, error } = await supabase
      .from('assets')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error || !asset) {
      return res.status(404).json({ error: 'Asset not found' });
    }

    // ✅ VERIFIED assets are PUBLIC - anyone can view them
    if (asset.verification_status === 'VERIFIED') {
      return res.json({
        success: true,
        data: asset
      });
    }

    // ⚠️ PENDING/REJECTED assets require ownership verification
    if (asset.verification_status === 'PENDING' || asset.verification_status === 'REJECTED') {
      if (!walletAddress || asset.owner_wallet.toLowerCase() !== walletAddress.toLowerCase()) {
        return res.status(403).json({ 
          error: 'This asset is pending verification and can only be viewed by the owner',
          message: 'Asset not yet publicly available'
        });
      }
    }

    // Return asset (owner viewing their pending asset)
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

    // Generate document hash
    const docString = JSON.stringify({ name, description, location });
    const documentHash = crypto.createHash('sha256').update(docString).digest('hex');

    console.log(`📝 Registering asset: ${name}`);

    // Create asset (starts as PENDING)
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

    // ⭐ AUTOMATIC VERIFICATION PROCESS
    // Runs in background - doesn't block the response
    setImmediate(async () => {
      try {
        const baseUrl = process.env.NODE_ENV === 'production' 
          ? 'https://assetoracle-backend.onrender.com'
          : 'http://localhost:5000';

        // Step 1: Analyze property
        console.log(`  → Analyzing property for asset ${asset.id}...`);
        const analysisResponse = await axios.post(`${baseUrl}/api/property/analyze`, {
          address: location?.address || name,
          city: location?.city || '',
          state: location?.state || ''
        });

        // Step 2: Run CRE workflow
        console.log(`  → Running Chainlink verification for asset ${asset.id}...`);
        const creResponse = await axios.post(`${baseUrl}/api/chainlink/run-workflow`, {
          propertyAddress: `${location?.address || name}, ${location?.city || ''}, ${location?.state || ''}`
        });

        // Step 3: Update to VERIFIED
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
        // Asset stays PENDING if verification fails
      }
    });

    // Return immediately (verification happens in background)
    res.status(201).json({
      success: true,
      message: 'Asset registered successfully. Verification in progress...',
      data: asset,
      verification: {
        status: 'PROCESSING',
        note: 'Asset will be automatically verified within 30-60 seconds. Refresh to see verified status.'
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
      return res.status(400).json({ 
        error: 'walletAddress is required' 
      });
    }

    // Get the asset
    const { data: asset, error: fetchError } = await supabase
      .from('assets')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (fetchError || !asset) {
      return res.status(404).json({ error: 'Asset not found' });
    }

    // Check if asset is unclaimed
    if (asset.verification_status !== 'UNCLAIMED') {
      return res.status(400).json({ 
        error: 'Asset is not available for claim',
        currentStatus: asset.verification_status
      });
    }

    console.log(`📝 Processing claim for asset ${req.params.id}`);

    // For now, auto-approve claims (can add document verification later)
    const verificationScore = 85; // Mock score

    if (verificationScore >= 70) {
      // Approve claim
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

      console.log(`Claim approved for asset ${req.params.id}`);

      return res.json({
        success: true,
        message: 'Claim approved - asset ownership transferred',
        data: claimedAsset,
        verification: {
          score: verificationScore,
          status: 'approved'
        }
      });

    } else {
      // Reject claim
      console.log(`Claim rejected for asset ${req.params.id}`);

      return res.json({
        success: false,
        message: 'Claim rejected - insufficient verification',
        verification: {
          score: verificationScore,
          status: 'rejected'
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

// POST /api/assets/:id/tokenize - Tokenize verified asset
router.post('/:id/tokenize', async (req, res) => {
  try {
    const { 
      tokenSupply, 
      pricePerToken, 
      walletAddress 
    } = req.body;

    if (!tokenSupply || !pricePerToken || !walletAddress) {
      return res.status(400).json({ 
        error: 'Missing required fields: tokenSupply, pricePerToken, walletAddress' 
      });
    }

    // Get asset
    const { data: asset, error: fetchError } = await supabase
      .from('assets')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (fetchError || !asset) {
      return res.status(404).json({ error: 'Asset not found' });
    }

    // Only verified assets can be tokenized
    if (asset.verification_status !== 'VERIFIED') {
      return res.status(400).json({ 
        error: 'Only verified assets can be tokenized',
        currentStatus: asset.verification_status
      });
    }

    // Check ownership
    if (asset.owner_wallet.toLowerCase() !== walletAddress.toLowerCase()) {
      return res.status(403).json({ 
        error: 'Only asset owner can tokenize' 
      });
    }

    console.log(`Tokenizing asset ${req.params.id}`);

    // Generate token ID and mock contract address (blockchain team will provide real ones)
    const tokenId = `AST-${Date.now()}`;
    const tokenContract = `0x${Math.random().toString(16).substr(2, 40)}`;

    // Update database
    const { data: tokenizedAsset, error: updateError } = await supabase
      .from('assets')
      .update({
        is_tokenized: true,
        token_id: tokenId,
        token_contract_address: tokenContract,
        token_supply: tokenSupply,
        price_per_token: pricePerToken,
        tokens_available: tokenSupply,
        tokenized_at: new Date().toISOString(),
        verification_status: 'TOKENIZED'
      })
      .eq('id', req.params.id)
      .select()
      .single();

    if (updateError) throw updateError;

    console.log(`Asset tokenized: ${tokenId}`);

    res.json({
      success: true,
      message: 'Asset tokenized successfully',
      data: {
        asset: tokenizedAsset,
        tokenization: {
          tokenId: tokenId,
          contractAddress: tokenContract,
          supply: tokenSupply,
          pricePerToken: pricePerToken,
          totalValue: tokenSupply * pricePerToken,
          tokensAvailable: tokenSupply
        }
      }
    });

  } catch (error) {
    console.error('Error tokenizing asset:', error);
    res.status(500).json({ 
      error: 'Failed to tokenize asset',
      details: error.message 
    });
  }
});

// POST /api/assets/:id/verify - Manual verify asset (backup endpoint)
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