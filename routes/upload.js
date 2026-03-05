const express = require('express');
const router = express.Router();
const supabase = require('../supabaseClient');
const crypto = require('crypto');

// POST /api/upload/file - Upload file to Supabase Storage
router.post('/file', async (req, res) => {
  try {
    const { file, fileName, fileType } = req.body;

    if (!file || !fileName) {
      return res.status(400).json({ 
        error: 'Missing required fields: file, fileName' 
      });
    }

    // Remove data URL prefix if present
    const base64Data = file.replace(/^data:.*;base64,/, '');
    
    // Convert base64 to buffer
    const fileBuffer = Buffer.from(base64Data, 'base64');

    // Generate unique filename
    const timestamp = Date.now();
    const randomStr = crypto.randomBytes(8).toString('hex');
    const fileExtension = fileName.split('.').pop();
    const uniqueFileName = `${timestamp}-${randomStr}.${fileExtension}`;

    console.log(`Uploading file: ${uniqueFileName}`);

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('asset-files')
      .upload(uniqueFileName, fileBuffer, {
        contentType: fileType || 'application/octet-stream',
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error('Upload error:', error);
      throw error;
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('asset-files')
      .getPublicUrl(uniqueFileName);

    console.log(`File uploaded: ${publicUrl}`);

    res.json({
      success: true,
      data: {
        fileName: uniqueFileName,
        originalName: fileName,
        url: publicUrl,
        size: fileBuffer.length
      }
    });

  } catch (error) {
    console.error('Error uploading file:', error);
    res.status(500).json({ 
      error: 'Failed to upload file',
      details: error.message 
    });
  }
});

// DELETE /api/upload/file/:fileName - Delete file from storage
router.delete('/file/:fileName', async (req, res) => {
  try {
    const { fileName } = req.params;

    const { error } = await supabase.storage
      .from('asset-files')
      .remove([fileName]);

    if (error) throw error;

    res.json({
      success: true,
      message: 'File deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting file:', error);
    res.status(500).json({ 
      error: 'Failed to delete file' 
    });
  }
});

module.exports = router;