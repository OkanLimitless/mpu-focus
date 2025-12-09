#!/usr/bin/env node

/**
 * Script to find admin users in the database
 * Usage: node scripts/find-admin.js [reset-password]
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

// Try to load environment variables from .env.local or .env
try {
  const envFiles = ['.env.local', '.env'];
  for (const envFile of envFiles) {
    const envPath = path.join(process.cwd(), envFile);
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf8');
      envContent.split('\n').forEach(line => {
        const match = line.match(/^([^=:#]+)=(.*)$/);
        if (match) {
          const key = match[1].trim();
          const value = match[2].trim().replace(/^["']|["']$/g, '');
          if (!process.env[key]) {
            process.env[key] = value;
          }
        }
      });
      break;
    }
  }
} catch (error) {
  // Ignore errors - environment variables might already be set
}

// Define User schema (matching the actual model)
const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

// Hash password before saving
UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

const User = mongoose.models.User || mongoose.model('User', UserSchema);

async function findAdminUsers() {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      console.error('❌ MONGODB_URI not found in environment variables');
      console.log('\n💡 Please set MONGODB_URI in your .env.local file');
      process.exit(1);
    }

    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB\n');

    // Find all admin users
    const adminUsers = await User.find({ role: 'admin' }).select('-password');
    
    if (adminUsers.length === 0) {
      console.log('⚠️  No admin users found in the database.\n');
      console.log('💡 To create an admin user:');
      console.log('   1. Set ADMIN_EMAIL and ADMIN_PASSWORD in .env.local');
      console.log('   2. Set ADMIN_INSTALL_TOKEN in .env.local');
      console.log('   3. Make sure your dev server is running');
      console.log('   4. Run: node scripts/setup.js');
      process.exit(0);
    }

    console.log(`📋 Found ${adminUsers.length} admin user(s):\n`);
    
    adminUsers.forEach((user, index) => {
      console.log(`${index + 1}. Email: ${user.email}`);
      console.log(`   Name: ${user.firstName} ${user.lastName}`);
      console.log(`   Active: ${user.isActive ? '✅ Yes' : '❌ No'}`);
      console.log(`   Created: ${user.createdAt}`);
      console.log('');
    });

    // Check environment variables
    console.log('🔑 Environment Variables:');
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@mpu-focus.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123456';
    console.log(`   ADMIN_EMAIL: ${adminEmail}`);
    console.log(`   ADMIN_PASSWORD: ${process.env.ADMIN_PASSWORD ? '***set***' : '***not set (using default)***'}`);
    console.log(`   ADMIN_INSTALL_TOKEN: ${process.env.ADMIN_INSTALL_TOKEN ? '***set***' : '***not set***'}\n`);

    // If reset-password argument is provided
    if (process.argv[2] === 'reset-password') {
      const readline = require('readline');
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });

      rl.question('\n⚠️  Enter the email of the admin user to reset password: ', async (email) => {
        rl.question('Enter new password (min 6 characters): ', async (newPassword) => {
          if (newPassword.length < 6) {
            console.error('❌ Password must be at least 6 characters');
            rl.close();
            await mongoose.disconnect();
            process.exit(1);
          }

          try {
            const user = await User.findOne({ email: email.toLowerCase().trim(), role: 'admin' });
            if (!user) {
              console.error(`❌ Admin user with email ${email} not found`);
              rl.close();
              await mongoose.disconnect();
              process.exit(1);
            }

            user.password = newPassword;
            await user.save();
            console.log(`✅ Password reset successfully for ${email}`);
            rl.close();
            await mongoose.disconnect();
            process.exit(0);
          } catch (error) {
            console.error('❌ Error resetting password:', error.message);
            rl.close();
            await mongoose.disconnect();
            process.exit(1);
          }
        });
      });
    } else {
      await mongoose.disconnect();
      console.log('💡 To reset an admin password, run:');
      console.log('   node scripts/find-admin.js reset-password');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

findAdminUsers();

