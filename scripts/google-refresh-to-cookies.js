#!/usr/bin/env node

/**
 * Convert Google Refresh Tokens to Netscape Cookie Format for AdsPower
 * 
 * Usage:
 *   node scripts/google-refresh-to-cookies.js <refresh_token> [client_id] [client_secret]
 * 
 * Or set environment variables:
 *   GOOGLE_CLIENT_ID=your_client_id
 *   GOOGLE_CLIENT_SECRET=your_client_secret
 *   node scripts/google-refresh-to-cookies.js <refresh_token>
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// Get command line arguments
const refreshToken = process.argv[2];
const clientId = process.argv[3] || process.env.GOOGLE_CLIENT_ID;
const clientSecret = process.argv[4] || process.env.GOOGLE_CLIENT_SECRET;

if (!refreshToken) {
  console.error('Error: Refresh token is required');
  console.error('\nUsage:');
  console.error('  node scripts/google-refresh-to-cookies.js <refresh_token> [client_id] [client_secret]');
  console.error('\nOr set environment variables:');
  console.error('  GOOGLE_CLIENT_ID=your_client_id');
  console.error('  GOOGLE_CLIENT_SECRET=your_client_secret');
  console.error('  node scripts/google-refresh-to-cookies.js <refresh_token>');
  process.exit(1);
}

if (!clientId || !clientSecret) {
  console.error('Error: Google Client ID and Client Secret are required');
  console.error('Provide them as arguments or set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables');
  process.exit(1);
}

/**
 * Exchange refresh token for access token
 */
function getAccessToken(refreshToken, clientId, clientSecret) {
  return new Promise((resolve, reject) => {
    const postData = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }).toString();

    const options = {
      hostname: 'oauth2.googleapis.com',
      port: 443,
      path: '/token',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData),
      },
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            const response = JSON.parse(data);
            resolve(response.access_token);
          } catch (error) {
            reject(new Error('Failed to parse access token response: ' + error.message));
          }
        } else {
          reject(new Error(`Failed to get access token: ${res.statusCode} - ${data}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(postData);
    req.end();
  });
}

/**
 * Get user info and session cookies using access token
 */
async function getGoogleSessionCookies(accessToken) {
  return new Promise((resolve, reject) => {
    // First, get user info to verify token works
    const options = {
      hostname: 'www.googleapis.com',
      port: 443,
      path: '/oauth2/v2/userinfo',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            const userInfo = JSON.parse(data);
            resolve({ userInfo, accessToken });
          } catch (error) {
            reject(new Error('Failed to parse user info: ' + error.message));
          }
        } else {
          reject(new Error(`Failed to get user info: ${res.statusCode} - ${data}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.end();
  });
}

/**
 * Generate Netscape cookie file format
 * Format: domain, flag, path, secure, expiration, name, value
 */
function generateNetscapeCookies(accessToken, userInfo) {
  const cookies = [];
  const domain = '.google.com';
  const now = Math.floor(Date.now() / 1000);
  const expiration = now + (30 * 24 * 60 * 60); // 30 days from now

  // Generate essential Google cookies
  // Note: These are simplified - real Google cookies are more complex
  // You may need to manually login once to get actual session cookies
  
  // SID (Session ID) - this is a placeholder, real one comes from actual login
  cookies.push({
    domain: domain,
    flag: 'TRUE',
    path: '/',
    secure: 'TRUE',
    expiration: expiration,
    name: 'SID',
    value: `placeholder_sid_${Date.now()}`,
  });

  // HSID (Hash Session ID)
  cookies.push({
    domain: domain,
    flag: 'TRUE',
    path: '/',
    secure: 'TRUE',
    expiration: expiration,
    name: 'HSID',
    value: `placeholder_hsid_${Date.now()}`,
  });

  // SSID (Secure Session ID)
  cookies.push({
    domain: domain,
    flag: 'TRUE',
    path: '/',
    secure: 'TRUE',
    expiration: expiration,
    name: 'SSID',
    value: `placeholder_ssid_${Date.now()}`,
  });

  // APISID (API Session ID)
  cookies.push({
    domain: domain,
    flag: 'TRUE',
    path: '/',
    secure: 'TRUE',
    expiration: expiration,
    name: 'APISID',
    value: `placeholder_apisid_${Date.now()}`,
  });

  // SAPISID (Secure API Session ID)
  cookies.push({
    domain: domain,
    flag: 'TRUE',
    path: '/',
    secure: 'TRUE',
    expiration: expiration,
    name: 'SAPISID',
    value: `placeholder_sapisid_${Date.now()}`,
  });

  // Store access token in a custom cookie (for reference)
  cookies.push({
    domain: domain,
    flag: 'TRUE',
    path: '/',
    secure: 'TRUE',
    expiration: expiration,
    name: '__google_access_token',
    value: accessToken,
  });

  return cookies;
}

/**
 * Format cookies in Netscape format
 */
function formatNetscapeCookies(cookies) {
  const lines = [
    '# Netscape HTTP Cookie File',
    '# This file was generated by google-refresh-to-cookies.js',
    '# Generated: ' + new Date().toISOString(),
    '#',
    '# Format: domain, flag, path, secure, expiration, name, value',
    '',
  ];

  cookies.forEach(cookie => {
    const line = [
      cookie.domain,
      cookie.flag,
      cookie.path,
      cookie.secure,
      cookie.expiration,
      cookie.name,
      cookie.value,
    ].join('\t');
    lines.push(line);
  });

  return lines.join('\n');
}

/**
 * Format cookies in JSON format (alternative for AdsPower)
 */
function formatJSONCookies(cookies) {
  return JSON.stringify(cookies.map(cookie => ({
    domain: cookie.domain,
    path: cookie.path,
    secure: cookie.secure === 'TRUE',
    httpOnly: false,
    expirationDate: cookie.expiration,
    name: cookie.name,
    value: cookie.value,
  })), null, 2);
}

/**
 * Main execution
 */
async function main() {
  try {
    console.log('🔄 Exchanging refresh token for access token...');
    const accessToken = await getAccessToken(refreshToken, clientId, clientSecret);
    console.log('✅ Access token obtained');

    console.log('🔍 Getting user information...');
    const { userInfo } = await getGoogleSessionCookies(accessToken);
    console.log(`✅ User: ${userInfo.email || userInfo.id}`);

    console.log('🍪 Generating cookie file...');
    const cookies = generateNetscapeCookies(accessToken, userInfo);

    // Generate Netscape format
    const netscapeFormat = formatNetscapeCookies(cookies);
    const netscapeFile = path.join(process.cwd(), `google-cookies-${Date.now()}.txt`);
    fs.writeFileSync(netscapeFile, netscapeFormat);
    console.log(`✅ Netscape format saved to: ${netscapeFile}`);

    // Generate JSON format
    const jsonFormat = formatJSONCookies(cookies);
    const jsonFile = path.join(process.cwd(), `google-cookies-${Date.now()}.json`);
    fs.writeFileSync(jsonFile, jsonFormat);
    console.log(`✅ JSON format saved to: ${jsonFile}`);

    console.log('\n⚠️  IMPORTANT NOTES:');
    console.log('1. The generated cookies are PLACEHOLDERS - they may not work directly');
    console.log('2. For best results, you should:');
    console.log('   a. Open AdsPower profile browser');
    console.log('   b. Navigate to accounts.google.com');
    console.log('   c. Use the access token programmatically to authenticate');
    console.log('   d. Export actual session cookies from the browser');
    console.log('\n3. Alternative: Use a browser automation tool (Puppeteer/Playwright)');
    console.log('   to login with the refresh token and export real cookies');

    console.log('\n📋 Access Token (for reference):');
    console.log(accessToken.substring(0, 50) + '...');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();


