const express = require('express');
const router = express.Router();
const { feedbackOps } = require('../../services/database');
const { requireAuth, requireAdmin } = require('../../middleware/auth');

/**
 * POST /api/v1/feedback
 * Submit bug report or feature request (public)
 */
router.post('/', (req, res) => {
  try {
    const { type, title, description, contact, website } = req.body;
    
    // Honeypot detection - bots often fill hidden fields
    if (website) {
      console.log('[SECURITY] Honeypot triggered - bot detected');
      // Return fake success to confuse bots
      return res.status(201).json({ success: true, message: 'ส่งข้อมูลสำเร็จ' });
    }
    
    // Validate required fields
    if (!type || !title) {
      return res.status(400).json({ error: 'Type and title are required' });
    }
    
    // Validate type
    if (!['bug', 'feature'].includes(type)) {
      return res.status(400).json({ error: 'Invalid feedback type' });
    }
    
    // Validate title length (max 200 chars)
    if (typeof title !== 'string' || title.length > 200) {
      return res.status(400).json({ error: 'Title must be 200 characters or less' });
    }
    
    // Validate description length (max 2000 chars)
    if (description && (typeof description !== 'string' || description.length > 2000)) {
      return res.status(400).json({ error: 'Description must be 2000 characters or less' });
    }
    
    // Validate contact length (max 100 chars)
    if (contact && (typeof contact !== 'string' || contact.length > 100)) {
      return res.status(400).json({ error: 'Contact must be 100 characters or less' });
    }
    
    const feedback = feedbackOps.create({
      type,
      title: title.trim(),
      description: description ? description.trim() : '',
      contact: contact ? contact.trim() : '',
      ip: req.clientIp || req.ip,
      userAgent: req.headers['user-agent']
    });
    
    if (!feedback) {
      return res.status(500).json({ error: 'Failed to submit feedback' });
    }
    
    res.status(201).json({
      success: true,
      message: type === 'bug' ? 'ส่งรายงานบัคสำเร็จ' : 'ส่งคำขอฟีเจอร์สำเร็จ',
      feedback
    });
  } catch (error) {
    console.error('[FEEDBACK] Error:', error.message);
    res.status(500).json({ error: 'Failed to submit feedback' });
  }
});

/**
 * GET /api/v1/feedback
 * Get all feedback (Admin only)
 */
router.get('/', requireAuth, requireAdmin, (req, res) => {
  try {
    const { status, limit } = req.query;
    
    let feedback;
    if (status) {
      feedback = feedbackOps.getByStatus(status, parseInt(limit) || 100);
    } else {
      feedback = feedbackOps.getAll(parseInt(limit) || 100);
    }
    
    res.json({
      success: true,
      count: feedback.length,
      feedback
    });
  } catch (error) {
    console.error('[FEEDBACK] Error:', error.message);
    res.status(500).json({ error: 'Failed to get feedback' });
  }
});

/**
 * GET /api/v1/feedback/stats
 * Get feedback stats (Admin only)
 */
router.get('/stats', requireAuth, requireAdmin, (req, res) => {
  try {
    const stats = feedbackOps.getStats();
    res.json({ success: true, stats });
  } catch (error) {
    console.error('[FEEDBACK] Error:', error.message);
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

/**
 * PUT /api/v1/feedback/:id
 * Update feedback status/notes (Admin only)
 */
router.put('/:id', requireAuth, requireAdmin, (req, res) => {
  try {
    const { id } = req.params;
    const { status, admin_notes } = req.body;
    
    // Check if exists
    const existing = feedbackOps.getById(id);
    if (!existing) {
      return res.status(404).json({ error: 'Feedback not found' });
    }

    const updated = feedbackOps.update(id, { status, admin_notes });
    
    if (!updated) {
      return res.status(500).json({ error: 'Update failed' });
    }
    
    res.json({ success: true, feedback: updated });
  } catch (error) {
    console.error('[FEEDBACK] Error:', error.message);
    res.status(500).json({ error: 'Failed to update feedback', details: error.message });
  }
});

/**
 * DELETE /api/v1/feedback/:id
 * Delete feedback (Admin only)
 */
router.delete('/:id', requireAuth, requireAdmin, (req, res) => {
  try {
    const { id } = req.params;
    
    const deleted = feedbackOps.delete(id);
    
    if (!deleted) {
      return res.status(404).json({ error: 'Feedback not found' });
    }
    
    res.json({ success: true, message: 'Feedback deleted' });
  } catch (error) {
    console.error('[FEEDBACK] Error:', error.message);
    res.status(500).json({ error: 'Failed to delete feedback' });
  }
});

module.exports = router;
