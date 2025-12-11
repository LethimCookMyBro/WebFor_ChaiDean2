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
    const { type, title, description, contact } = req.body;
    
    if (!type || !title) {
      return res.status(400).json({ error: 'Type and title are required' });
    }
    
    if (!['bug', 'feature'].includes(type)) {
      return res.status(400).json({ error: 'Type must be "bug" or "feature"' });
    }
    
    const feedback = feedbackOps.create({
      type,
      title,
      description,
      contact,
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
    
    // Debug: Check if exists
    const existing = feedbackOps.getById(id);
    if (!existing) {
      return res.status(404).json({ 
        error: 'Feedback not found', 
        debug: { 
          reason: 'ID not found in database',
          receivedId: id,
          idType: typeof id,
          params: req.params
        } 
      });
    }

    const updated = feedbackOps.update(id, { status, admin_notes });
    
    if (!updated) {
      return res.status(404).json({ 
        error: 'Update failed', 
        debug: {
           reason: 'Update operation returned null (no changes or DB error)',
           existingRecord: existing,
           payload: { status, admin_notes },
           receivedBody: req.body
        }
      });
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
