const Notification = require('../models/Notification');

const ok   = (res, data, status = 200) => res.status(status).json({ success: true,  data });
const fail = (res, message, status = 400) => res.status(status).json({ success: false, message });

// ── GET /api/notifications — fetch recent notifications for logged-in user ─
const getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    const unreadCount = notifications.filter((n) => !n.isRead).length;
    return ok(res, { notifications, unreadCount });
  } catch (error) {
    return fail(res, error.message, 500);
  }
};

// ── PATCH /api/notifications/:id/read — mark one notification as read ──────
const markRead = async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { isRead: true },
      { new: true }
    );
    if (!notification) return fail(res, 'Notification not found.', 404);
    return ok(res, notification);
  } catch (error) {
    return fail(res, error.message, 500);
  }
};

// ── PATCH /api/notifications/read-all — mark all as read ───────────────────
const markAllRead = async (req, res) => {
  try {
    await Notification.updateMany({ userId: req.user._id, isRead: false }, { isRead: true });
    return ok(res, { message: 'All notifications marked as read.' });
  } catch (error) {
    return fail(res, error.message, 500);
  }
};

/**
 * Internal helper — create a notification for a user.
 * Called from other controllers (e.g. when a task is created).
 */
const createNotification = async (userId, message, type = 'assignment') => {
  try {
    await Notification.create({ userId, message, type });
  } catch {
    // Non-critical — don't throw
  }
};

module.exports = { getNotifications, markRead, markAllRead, createNotification };
