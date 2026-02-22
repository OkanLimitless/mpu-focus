#!/usr/bin/env node

const https = require('https');
const http = require('http');

const setupAdmin = async () => {
  const postData = JSON.stringify({});
  const installToken = process.env.ADMIN_INSTALL_TOKEN || ''
  
  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/admin/init',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData),
      'x-install-token': installToken,
    }
  };

  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          resolve({ status: res.statusCode, data: response });
        } catch (error) {
          reject(error);
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(postData);
    req.end();
  });
};

const main = async () => {
  console.log('🚀 Setting up MPU-Focus platform...\n');
  
  try {
    console.log('📝 Creating admin user...');
    const result = await setupAdmin();
    
    if (result.status === 201) {
      console.log('✅ Admin user created successfully!');
      console.log(`📧 Email: ${result.data.email}`);
      console.log('🔑 Password: Check your .env.local file for ADMIN_PASSWORD\n');
    } else if (result.status === 400) {
      console.log('ℹ️  Admin user already exists.');
    } else if (result.status === 403) {
      console.log('❌ Forbidden: check ADMIN_INSTALL_TOKEN and pass it in request headers.');
    } else {
      console.log('❌ Failed to create admin user:', result.data.message);
    }
    
    console.log('🎉 Setup completed!');
    console.log('\n📋 Next steps:');
    console.log('1. Ensure SUPABASE_URL, SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY are set');
    console.log('2. Ensure ADMIN_INSTALL_TOKEN, ADMIN_EMAIL and ADMIN_PASSWORD are set');
    console.log('3. Run "npm run dev" to start the development server');
    console.log('4. Visit http://localhost:3000/login to sign in');
    console.log('\n👤 Admin login:');
    console.log('   Email: admin@mpu-focus.com (or check ADMIN_EMAIL in .env.local)');
    console.log('   Password: Check ADMIN_PASSWORD in .env.local');
    
  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('1. Make sure the development server is running (npm run dev)');
    console.log('2. Check Supabase environment variables and project status');
    console.log('3. Verify ADMIN_INSTALL_TOKEN is configured correctly');
  }
};

if (require.main === module) {
  main();
}

module.exports = { setupAdmin };
