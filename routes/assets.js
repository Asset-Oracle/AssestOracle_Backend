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

// GET /api/assets/:id - Get single asset
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

    // Access Control: Only show PENDING/REJECTED assets to owner
    if (asset.verification_status !== 'VERIFIED') {
      // Check if requester is the owner
      if (!walletAddress || asset.owner_wallet.toLowerCase() !== walletAddress.toLowerCase()) {
        return res.status(403).json({ 
          error: 'This asset is not yet verified and can only be viewed by the owner',
          message: 'Asset is pending verification'
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
    // Runs in background - don't block the response
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