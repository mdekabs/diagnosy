import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────
const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_TIME = 30 * 60 * 1000; // 30 minutes

// ─────────────────────────────────────────────
// User Schema
// ─────────────────────────────────────────────
const UserSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      minlength: 3,
      maxlength: 30,
      validate: {
        validator: (v) => /^[A-Za-z0-9_]+$/.test(v),
        message: (props) =>
          `${props.value} is not a valid username! Use only letters, numbers, and underscores.`
      }
    },

    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
      validate: {
        validator: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
        message: (props) => `${props.value} is not a valid email address!`
      }
    },

    password: {
      type: String,
      required: true,
      minlength: 8
    },

    lastLogin: {
      type: Date,
      default: Date.now
    },

    isAdmin: {
      type: Boolean,
      default: false
    },

    resetPasswordToken: String,
    resetPasswordExpires: Date,

    loginAttempts: {
      type: Number,
      default: 0
    },

    lockUntil: {
      type: Number
    }
  },
  { timestamps: true }
);

// ─────────────────────────────────────────────
// Middleware: Password Hashing
// ─────────────────────────────────────────────
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// ─────────────────────────────────────────────
// Virtuals
// ─────────────────────────────────────────────
UserSchema.virtual('isLocked').get(function () {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

// ─────────────────────────────────────────────
// Instance Methods
// ─────────────────────────────────────────────

/**
 * Compare a plain password with the hashed password.
 * @param {string} candidatePassword
 * @returns {Promise<boolean>}
 */
UserSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

/**
 * Increment login attempts and apply lockout if necessary.
 * @returns {Promise}
 */
UserSchema.methods.incrementLoginAttempts = function () {
  if (this.isLocked) {
    // If lock expired, reset attempts
    if (Date.now() > this.lockUntil) {
      return this.updateOne({
        $set: { loginAttempts: 1 },
        $unset: { lockUntil: 1 }
      }).exec();
    }
    // If still locked, just increment attempts
    return this.updateOne({ $inc: { loginAttempts: 1 } }).exec();
  }

  const updates = { $inc: { loginAttempts: 1 } };

  if (this.loginAttempts + 1 >= MAX_LOGIN_ATTEMPTS) {
    updates.$set = { lockUntil: Date.now() + LOCK_TIME };
  }

  return this.updateOne(updates).exec();
};

/**
 * Reset login attempts manually.
 * @returns {Promise}
 */
UserSchema.methods.resetLoginAttempts = function () {
  return this.updateOne({
    $set: { loginAttempts: 0 },
    $unset: { lockUntil: 1 }
  }).exec();
};

/**
 * Check if the user is allowed to log in.
 * @returns {boolean}
 */
UserSchema.methods.canLogin = function () {
  return !this.isLocked;
};

// ─────────────────────────────────────────────
// Static Methods
// ─────────────────────────────────────────────

/**
 * Update login data after a successful login.
 * @param {string} userId - MongoDB user ID
 * @returns {Promise<{currentLoginTime: number}>}
 */
UserSchema.statics.recordLoginSuccess = async function (userId) {
  const currentLoginTime = Date.now();

  const updateResult = await this.updateOne(
    { _id: userId },
    {
      $set: {
        loginAttempts: 0,
        lastLogin: new Date(currentLoginTime)
      },
      $unset: { lockUntil: '' }
    }
  );

  if (updateResult.modifiedCount === 0) {
    throw new Error(`Failed to update lastLogin for user: ${userId}`);
  }

  return { currentLoginTime };
};

// ─────────────────────────────────────────────
// Model Export
// ─────────────────────────────────────────────
const User = mongoose.model('User', UserSchema);
export default User;
