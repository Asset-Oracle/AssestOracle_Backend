const express = require('express');
const router = express.Router();
const supabase = require('../supabaseClient');

// GET /api/user/dashboard/:walletAddress
router.get('/dashboard/:walletAddress', async (req, res) => {
  try {
    const walletAddress = req.params.walletAddress.toLowerCase();

    // Get user
    const { data: user } = await supabase
      .from('users')
      .select('*')
      .eq('wallet_address', walletAddress)
      .single();

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get user's assets
    const { data: assets } = await supabase
      .from('assets')
      .select('*')
      .eq('owner_wallet', walletAddress);

    // Calculate stats
    const stats = {
      totalAssetValue: assets.reduce((sum, a) => sum + (a.estimated_value || 0), 0),
      totalInvestments: 0,
      verifiedAssets: assets.filter(a => a.verification_status === 'VERIFIED').length,
      pendingVerifications: assets.filter(a => a.verification_status === 'PENDING').length,
      totalAssets: assets.length
    };

    res.json({
      success: true,
      data: {
        user,
        stats
      }
    });

  } catch (error) {
    console.error('Error fetching dashboard:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard' });
  }
});

// GET /api/user/portfolio/:walletAddress
router.get('/portfolio/:walletAddress', async (req, res) => {
  try {
    const { data: assets, error } = await supabase
      .from('assets')
      .select('*')
      .eq('owner_wallet', req.params.walletAddress.toLowerCase())
      .order('created_at', { ascending: false });

    if (error) throw error;

    const totalValue = assets.reduce((sum, a) => sum + (a.estimated_value || 0), 0);

    res.json({
      success: true,
      data: {
        assets,
        summary: {
          total: assets.length,
          totalValue,
          verified: assets.filter(a => a.verification_status === 'VERIFIED').length,
          pending: assets.filter(a => a.verification_status === 'PENDING').length
        }
      }
    });

  } catch (error) {
    console.error('Error fetching portfolio:', error);
    res.status(500).json({ error: 'Failed to fetch portfolio' });
  }
});

module.exports = router;