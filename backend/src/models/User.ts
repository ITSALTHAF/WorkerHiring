import mongoose, { Schema, Document } from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export interface IUser extends Document {
  email: string;
  phone?: string;
  password: string;
  role: 'client' | 'worker' | 'admin';
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  authProvider: 'local' | 'google' | 'apple' | 'facebook';
  authProviderId?: string;
  mfaEnabled: boolean;
  mfaMethod?: 'app' | 'sms' | 'email';
  kycVerified: boolean;
  kycDocuments?: string[];
  lastLogin?: Date;
  isActive: boolean;
  deviceTokens?: string[];
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
  getSignedJwtToken(): string;
}

const UserSchema: Schema = new Schema(
  {
    email: {
      type: String,
      required: [true, 'Please add an email'],
      unique: true,
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        'Please add a valid email',
      ],
    },
    phone: {
      type: String,
      match: [
        /^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$/,
        'Please add a valid phone number',
      ],
    },
    password: {
      type: String,
      required: [true, 'Please add a password'],
      minlength: 6,
      select: false,
    },
    role: {
      type: String,
      enum: ['client', 'worker', 'admin'],
      default: 'client',
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    isPhoneVerified: {
      type: Boolean,
      default: false,
    },
    authProvider: {
      type: String,
      enum: ['local', 'google', 'apple', 'facebook'],
      default: 'local',
    },
    authProviderId: {
      type: String,
    },
    mfaEnabled: {
      type: Boolean,
      default: false,
    },
    mfaMethod: {
      type: String,
      enum: ['app', 'sms', 'email'],
    },
    kycVerified: {
      type: Boolean,
      default: false,
    },
    kycDocuments: {
      type: [String],
    },
    lastLogin: {
      type: Date,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    deviceTokens: {
      type: [String],
    },
  },
  {
    timestamps: true,
  }
);

// Encrypt password using bcrypt
UserSchema.pre<IUser>('save', async function (next) {
  if (!this.isModified('password')) {
    next();
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Sign JWT and return
UserSchema.methods.getSignedJwtToken = function () {
  return jwt.sign(
    { id: this._id },
    process.env.JWT_SECRET || 'your_jwt_secret_key_here',
    {
      expiresIn: process.env.JWT_EXPIRE || '30d',
    }
  );
};

// Match user entered password to hashed password in database
UserSchema.methods.comparePassword = async function (enteredPassword: string) {
  return await bcrypt.compare(enteredPassword, this.password);
};

export default mongoose.model<IUser>('User', UserSchema);
