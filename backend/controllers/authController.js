const jwt  = require('jsonwebtoken');
const User = require('../models/User');
const { JWT_EXPIRY, MAX_NAME_LEN } = require('../config/constants');

// Minimal JWT payload: { id, role }
const generateToken = (id, role) =>
  jwt.sign({ id, role }, process.env.JWT_SECRET, { expiresIn: JWT_EXPIRY });

// ── POST /api/auth/signup ────────────────────────────────────────────────────
const signup = async (req, res) => {
  const name     = (req.body.name     || '').trim();
  const email    = (req.body.email    || '').trim().toLowerCase();
  const password =  req.body.password || '';
  const role     = req.body.role === 'teacher' ? 'teacher' : 'student';

  if (!name)             return res.status(400).json({ success: false, message: 'Name is required.' });
  if (name.length > MAX_NAME_LEN)
    return res.status(400).json({ success: false, message: `Name must be ${MAX_NAME_LEN} characters or fewer.` });
  if (!email)            return res.status(400).json({ success: false, message: 'Email is required.' });
  if (password.length < 6)
    return res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });

  try {
    const user = await User.create({ name, email, password, role });

    res.status(201).json({
      success: true,
      data: {
        _id:   user._id,
        name:  user.name,
        email: user.email,
        role:  user.role,
        token: generateToken(user._id, user.role),
      },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'Email already registered.' });
    }
    res.status(400).json({ success: false, message: error.message });
  }
};

// ── POST /api/auth/login ─────────────────────────────────────────────────────
const login = async (req, res) => {
  const email    = (req.body.email    || '').trim().toLowerCase();
  const password =  req.body.password || '';
  // Optional role check — sent by the role-specific login panels
  const role     =  req.body.role     || null;

  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Email and password are required.' });
  }

  try {
    const user = await User.findOne({ email });

    // Generic credential check — avoids leaking whether the email exists
    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    // Role mismatch — user exists but is trying the wrong panel
    if (role && user.role !== role) {
      return res.status(401).json({
        success: false,
        message: `You are not registered as a ${role}. Please use the correct login panel.`,
      });
    }

    res.json({
      success: true,
      data: {
        _id:   user._id,
        name:  user.name,
        email: user.email,
        role:  user.role,
        token: generateToken(user._id, user.role),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { signup, login };
