const express = require('express');
const router = express.Router();
const supabase = require('../supabaseClient');
const crypto = require('crypto');

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

// POST /api/assets/register - Register new asset
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

    const { data: asset, error } = await supabase
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

    if (error) throw error;

    res.status(201).json({
      success: true,
      message: 'Asset registered successfully',
      data: asset
    });

  } catch (error) {
    console.error('Error registering asset:', error);
    res.status(500).json({ error: 'Failed to register asset' });
  }
});

// POST /api/assets/:id/verify - Verify asset
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