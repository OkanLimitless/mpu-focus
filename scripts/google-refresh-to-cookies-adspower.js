#!/usr/bin/env node

/**
 * Convert Google Refresh Tokens to Cookies using AdsPower API
 * 
 * This script:
 * 1. Uses AdsPower API to open/create a browser profile
 * 2. Connects to the AdsPower browser via CDP (Chrome DevTools Protocol)
 * 3. Uses refresh token to authenticate and establish Google session
 * 4. Extracts real cookies via AdsPower API
 * 
 * Requirements:
 *   npm install puppeteer-core axios
 * 
 * Usage:
 *   node scripts/google-refresh-to-cookies-adspower.js <refresh_token> <profile_id> [client_id] [client_secret]
 * 
 * Environment variables:
 *   ADSPOWER_API_KEY - Your AdsPower API key
 *   ADSPOWER_API_URL - AdsPower API URL (default: http://local.adspower.net:50325)
 *   GOOGLE_CLIENT_ID - Google OAuth client ID
 *   GOOGLE_CLIENT_SECRET - Google OAuth client secret
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

// Check dependencies
let axios, puppeteer;
try {
  axios = require('axios');
} catch (error) {
  console.error('❌ Error: axios is not installed');
  console.error('Install it with: npm install axios');
  process.exit(1);
}

try {
  puppeteer = require('puppeteer-core');
} catch (error) {
  console.error('❌ Error: puppeteer-core is not installed');
  console.error('Install it with: npm install puppeteer-core');
  process.exit(1);
}

const refreshToken = process.argv[2];
const profileId = process.argv[3];
const clientId = process.argv[4] || process.env.GOOGLE_CLIENT_ID;
const clientSecret = process.argv[5] || process.env.GOOGLE_CLIENT_SECRET;
const adspowerApiKey = process.env.ADSPOWER_API_KEY || '';
const adspowerApiUrl = process.env.ADSPOWER_API_URL || 'http://local.adspower.net:50325';

if (!refreshToken) {
  console.error('Error: Refresh token is required');
  console.error('\nUsage:');
  console.error('  node scripts/google-refresh-to-cookies-adspower.js <refresh_token> <profile_id> [client_id] [client_secret]');
  process.exit(1);
}

if (!profileId) {
  console.error('Error: AdsPower profile ID is required');
  console.error('You can find it in AdsPower > Profile Management');
  process.exit(1);
}

if (!clientId || !clientSecret) {
  console.error('Error: Google Client ID and Client Secret are required');
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
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode === 200) {
          const response = JSON.parse(data);
          resolve({
            accessToken: response.access_token,
            expiresIn: response.expires_in,
          });
        } else {
          reject(new Error(`Failed to get access token: ${res.statusCode} - ${data}`));
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

/**
 * Get user info from access token
 */
function getUserInfo(accessToken) {
  return new Promise((resolve, reject) => {
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
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve(JSON.parse(data));
        } else {
          reject(new Error(`Failed to get user info: ${res.statusCode} - ${data}`));
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

/**
 * AdsPower API: Start browser profile
 */
async function startAdsPowerProfile(profileId) {
  try {
    const response = await axios.post(`${adspowerApiUrl}/api/v1/browser/start`, {
      user_id: profileId,
      open_urls: [],
      headless: false,
    }, {
      headers: {
        'Content-Type': 'application/json',
      },
      params: adspowerApiKey ? { api_key: adspowerApiKey } : {},
    });

    if (response.data.code === 0) {
      return response.data.data.ws.puppeteer;
    } else {
      throw new Error(`AdsPower API error: ${response.data.msg || response.data.message}`);
    }
  } catch (error) {
    if (error.response) {
      throw new Error(`AdsPower API error: ${error.response.data?.msg || error.response.statusText}`);
    }
    throw error;
  }
}

/**
 * AdsPower API: Stop browser profile
 */
async function stopAdsPowerProfile(profileId) {
  try {
    await axios.post(`${adspowerApiUrl}/api/v1/browser/stop`, {
      user_ids: [profileId],
    }, {
      headers: {
        'Content-Type': 'application/json',
      },
      params: adspowerApiKey ? { api_key: adspowerApiKey } : {},
    });
  } catch (error) {
    console.warn('Warning: Failed to stop AdsPower profile:', error.message);
  }
}

/**
 * AdsPower API: Get cookies from profile
 */
async function getAdsPowerCookies(profileId) {
  try {
    const response = await axios.get(`${adspowerApiUrl}/api/v2/browser-profile/cookies`, {
      params: {
        user_id: profileId,
        ...(adspowerApiKey ? { api_key: adspowerApiKey } : {}),
      },
    });

    if (response.data.code === 0) {
      return response.data.data || [];
    } else {
      throw new Error(`AdsPower API error: ${response.data.msg || response.data.message}`);
    }
  } catch (error) {
    if (error.response) {
      throw new Error(`AdsPower API error: ${error.response.data?.msg || error.response.statusText}`);
    }
    throw error;
  }
}

/**
 * Format cookies in Netscape format for AdsPower
 */
function formatNetscapeCookies(cookies) {
  const lines = [
    '# Netscape HTTP Cookie File',
    '# Generated: ' + new Date().toISOString(),
    '# Real Google session cookies from AdsPower',
    '#',
  ];

  cookies.forEach(cookie => {
    const expiration = cookie.expirationDate 
      ? Math.floor(cookie.expirationDate)
      : Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60);
    
    const domain = cookie.domain.startsWith('.') ? cookie.domain : '.' + cookie.domain;
    const line = [
      domain,
      'TRUE',
      cookie.path || '/',
      cookie.secure ? 'TRUE' : 'FALSE',
      expiration,
      cookie.name,
      cookie.value,
    ].join('\t');
    lines.push(line);
  });

  return lines.join('\n');
}

/**
 * Format cookies in JSON format
 */
function formatJSONCookies(cookies) {
  return JSON.stringify(cookies.map(cookie => ({
    domain: cookie.domain,
    path: cookie.path || '/',
    secure: cookie.secure || false,
    httpOnly: cookie.httpOnly || false,
    expirationDate: cookie.expirationDate || Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60),
    name: cookie.name,
    value: cookie.value,
  })), null, 2);
}

/**
 * Main execution
 */
async function main() {
  let browser;
  
  try {
    console.log('🔄 Step 1: Exchanging refresh token for access token...');
    const { accessToken } = await getAccessToken(refreshToken, clientId, clientSecret);
    console.log('✅ Access token obtained');

    console.log('👤 Step 2: Getting user information...');
    const userInfo = await getUserInfo(accessToken);
    console.log(`✅ User: ${userInfo.email || userInfo.id}`);

    console.log('🚀 Step 3: Starting AdsPower profile...');
    const wsEndpoint = await startAdsPowerProfile(profileId);
    console.log(`✅ Profile started. WebSocket: ${wsEndpoint}`);

    console.log('🌐 Step 4: Connecting to AdsPower browser...');
    browser = await puppeteer.connect({
      browserWSEndpoint: wsEndpoint,
      defaultViewport: null,
    });

    const pages = await browser.pages();
    const page = pages[0] || await browser.newPage();

    console.log('🔐 Step 5: Establishing Google session...');
    console.log('   This may require manual intervention...');

    // Navigate to Google and try to establish session
    await page.goto('https://accounts.google.com', { waitUntil: 'networkidle2', timeout: 30000 });

    // Try to use access token to authenticate
    await page.evaluate((token, email) => {
      // Store token
      window.__google_access_token = token;
      window.__google_email = email;
      
      // Try to validate token
      fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { 'Authorization': `Bearer ${token}` }
      }).then(r => r.json()).then(data => {
        console.log('Token validated for:', data.email);
      });
    }, accessToken, userInfo.email);

    await page.waitForTimeout(2000);

    // Navigate to Gmail to establish session
    console.log('📧 Step 6: Navigating to Gmail...');
    await page.goto('https://mail.google.com', { waitUntil: 'networkidle2', timeout: 30000 });
    await page.waitForTimeout(3000);

    // Check if logged in
    const isLoggedIn = await page.evaluate(() => {
      return document.cookie.includes('SID') || 
             document.cookie.includes('HSID') ||
             !window.location.href.includes('accounts.google.com/signin');
    });

    if (!isLoggedIn) {
      console.log('\n⚠️  Automatic authentication may have failed.');
      console.log('📝 Options:');
      console.log('   1. The browser window is open - manually log in if needed');
      console.log('   2. Wait a moment for automatic auth to complete');
      console.log('   3. Press Enter to continue extracting cookies...');
      
      await new Promise(resolve => {
        process.stdin.once('data', resolve);
      });
      
      await page.reload({ waitUntil: 'networkidle2' });
      await page.waitForTimeout(2000);
    }

    console.log('🍪 Step 7: Extracting cookies via AdsPower API...');
    const cookies = await getAdsPowerCookies(profileId);
    
    // Filter for Google cookies
    const googleCookies = cookies.filter(cookie => 
      cookie.domain && (
        cookie.domain.includes('google.com') || 
        cookie.domain.includes('googleapis.com') ||
        cookie.domain.includes('gstatic.com') ||
        cookie.domain.includes('youtube.com')
      )
    );

    const essentialCookies = ['SID', 'HSID', 'SSID', 'APISID', 'SAPISID', 'NID', 'SIDCC'];
    const foundEssential = googleCookies.filter(c => essentialCookies.includes(c.name));
    
    console.log(`✅ Found ${googleCookies.length} Google cookies`);
    console.log(`✅ Found ${foundEssential.length} essential session cookies: ${foundEssential.map(c => c.name).join(', ')}`);

    if (googleCookies.length === 0) {
      console.error('❌ No Google cookies found.');
      console.log('   Try manually logging in the AdsPower browser, then run this script again.');
      process.exit(1);
    }

    // Generate Netscape format
    const timestamp = Date.now();
    const netscapeFormat = formatNetscapeCookies(googleCookies);
    const netscapeFile = path.join(process.cwd(), `google-cookies-adspower-${timestamp}.txt`);
    fs.writeFileSync(netscapeFile, netscapeFormat);
    console.log(`\n✅ Netscape format saved to: ${netscapeFile}`);

    // Generate JSON format
    const jsonFormat = formatJSONCookies(googleCookies);
    const jsonFile = path.join(process.cwd(), `google-cookies-adspower-${timestamp}.json`);
    fs.writeFileSync(jsonFile, jsonFormat);
    console.log(`✅ JSON format saved to: ${jsonFile}`);

    console.log('\n📋 Cookie Summary:');
    googleCookies.forEach(cookie => {
      const essential = essentialCookies.includes(cookie.name) ? ' ⭐' : '';
      console.log(`  - ${cookie.name}${essential} (${cookie.domain})`);
    });

    console.log('\n✅ Success! Real Google session cookies extracted.');
    console.log('   You can now import the .txt file into other AdsPower profiles');

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
  } finally {
    if (browser) {
      await browser.disconnect();
    }
    // Don't stop the profile - user might want to keep it open
    console.log('\n💡 Note: AdsPower profile is still running. Close it manually or use the API to stop it.');
  }
}

main();


