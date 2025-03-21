const mongoose = require('mongoose');
import bcrypt from "bcrypt";

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  phone: {
    type: String,
    required: true
  },

  role: {
    type: String,
    required: true  
  },

  address: {
    type: String,
    required: true
  },

  bloodGroup: {
    type: String,
    required: true
  },

  googleAuthSecret: {
    type: String  // for google auth
  },
  
  isTwoFactorAuthEnabled: {
    type: Boolean,
    default: false
  },

}, { timestamps: true });


// Hash password before saving user
UserSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});


// Compare password
UserSchema.methods.comparePassword = async function (password) {
  return await bcrypt.compare(password, this.password);
};

module.exports = mongoose.model('User', UserSchema);
