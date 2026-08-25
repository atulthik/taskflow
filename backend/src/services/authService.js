const User = require('../models/User');
const RefreshToken = require('../models/RefreshToken');
const { generateAccessToken, generateRefreshToken, verifyRefreshToken } = require('../utils/jwt');
const crypto = require('crypto');

const registerUser = async ({ email, password, role }) => {
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new Error('Email already in use');
  }

  const user = new User({ email, password, role });
  await user.save();

  return { message: 'User registered successfully' };
};

const loginUser = async ({ email, password }) => {
  const user = await User.findOne({ email });
  if (!user) {
    throw new Error('Invalid email or password');
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    throw new Error('Invalid email or password');
  }

  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);

  // Calculate expiration for DB (e.g. 7 days from now)
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  const newRefreshToken = new RefreshToken({
    token: refreshToken,
    userId: user._id,
    expiresAt
  });
  await newRefreshToken.save();

  return {
    accessToken,
    refreshToken,
    user: {
      id: user._id,
      email: user.email,
      role: user.role
    }
  };
};

const refreshAccessToken = async (token) => {
  if (!token) {
    throw new Error('Refresh token required');
  }

  const existingToken = await RefreshToken.findOne({ token });
  if (!existingToken) {
    throw new Error('Invalid refresh token');
  }

  try {
    const decoded = verifyRefreshToken(token);
    const user = await User.findById(decoded.userId);
    
    if (!user) {
      throw new Error('User not found');
    }

    const accessToken = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken(user);

    // Rotate refresh token
    existingToken.token = newRefreshToken;
    existingToken.expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await existingToken.save();

    return { accessToken, refreshToken: newRefreshToken };
  } catch (err) {
    await RefreshToken.deleteOne({ token });
    throw new Error('Invalid or expired refresh token');
  }
};

const logoutUser = async (token) => {
  await RefreshToken.deleteOne({ token });
  return { message: 'Logged out successfully' };
};

module.exports = {
  registerUser,
  loginUser,
  refreshAccessToken,
  logoutUser
};
