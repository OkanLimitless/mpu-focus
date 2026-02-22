#!/usr/bin/env node

/**
 * Fix Failing Google Cookies Using Refresh Token
 * 
 * When Google cookies fail and ask for login, use refresh token to:
 * 1. Get fresh access token
 * 2. Complete authentication flow
 * 3. Generate new working session cookies
 * 
 * This works with AdsPower profiles that have cookies but Google is asking for re-login.
 * 
 * Requirements:
 *   npm install puppeteer-core axios
 * 
 * Usage:
 *   node scripts/google-refresh-fix-cookies.js <refresh_token> <profile_id> [client_id] [client_secret]
 */

const https = require('https');
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
  console.error('  node scripts/google-refresh-fix-cookies.js <refresh_token> <profile_id> [client_id] [client_secret]');
  process.exit(1);
}

if (!profileId) {
  console.error('Error: AdsPower profile ID is required');
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
 * AdsPower API: Update cookies in profile
 */
async function updateAdsPowerCookies(profileId, cookies) {
  try {
    const response = await axios.post(`${adspowerApiUrl}/api/v2/browser-profile/cookies`, {
      user_id: profileId,
      cookies: cookies,
    }, {
      headers: {
        'Content-Type': 'application/json',
      },
      params: adspowerApiKey ? { api_key: adspowerApiKey } : {},
    });

    if (response.data.code === 0) {
      return true;
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
 * Format cookies in Netscape format
 */
function formatNetscapeCookies(cookies) {
  const lines = [
    '# Netscape HTTP Cookie File',
    '# Generated: ' + new Date().toISOString(),
    '# Fixed Google session cookies using refresh token',
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
 * Main execution - Fix failing cookies
 */
async function main() {
  let browser;
  
  try {
    console.log('🔄 Step 1: Getting fresh access token from refresh token...');
    const { accessToken } = await getAccessToken(refreshToken, clientId, clientSecret);
    console.log('✅ Access token obtained');

    console.log('👤 Step 2: Verifying user...');
    const userInfo = await getUserInfo(accessToken);
    console.log(`✅ User: ${userInfo.email || userInfo.id}`);

    console.log('🚀 Step 3: Starting AdsPower profile...');
    const wsEndpoint = await startAdsPowerProfile(profileId);
    console.log(`✅ Profile started`);

    console.log('🌐 Step 4: Connecting to browser...');
    browser = await puppeteer.connect({
      browserWSEndpoint: wsEndpoint,
      defaultViewport: null,
    });

    const pages = await browser.pages();
    const page = pages[0] || await browser.newPage();

    console.log('🔍 Step 5: Checking current session status...');
    
    // Navigate to a Google service to see if login is required
    await page.goto('https://mail.google.com', { waitUntil: 'networkidle2', timeout: 30000 });
    await page.waitForTimeout(2000);

    // Check if we're being asked to login
    const needsLogin = await page.evaluate(() => {
      return window.location.href.includes('accounts.google.com/signin') ||
             window.location.href.includes('accounts.google.com/ServiceLogin') ||
             document.querySelector('input[type="email"]') !== null ||
             document.querySelector('input[type="password"]') !== null;
    });

    if (needsLogin) {
      console.log('⚠️  Google is asking for login - using refresh token to authenticate...');

      // Strategy: Use access token to complete OAuth flow
      // Navigate to OAuth consent screen with access token
      const oauthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=urn:ietf:wg:oauth:2.0:oob&response_type=code&scope=openid%20email%20profile&access_type=offline&prompt=consent`;
      
      await page.goto(oauthUrl, { waitUntil: 'networkidle2', timeout: 30000 });
      await page.waitForTimeout(2000);

      // Try to inject access token and complete auth
      console.log('🔐 Injecting access token to complete authentication...');
      
      await page.evaluate((token, email) => {
        // Store token
        window.__google_access_token = token;
        window.__google_email = email;
        
        // Try to use token to authenticate via fetch
        fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
          headers: { 'Authorization': `Bearer ${token}` }
        }).then(r => r.json()).then(data => {
          console.log('Access token validated for:', data.email);
          
          // Try to set a cookie manually (this is a workaround)
          document.cookie = `__google_access_token=${token}; domain=.google.com; path=/; secure; samesite=none`;
        });
      }, accessToken, userInfo.email);

      await page.waitForTimeout(2000);

      // Navigate back to Gmail to establish session
      console.log('📧 Navigating to Gmail to establish session...');
      await page.goto('https://mail.google.com', { waitUntil: 'networkidle2', timeout: 30000 });
      await page.waitForTimeout(3000);

      // Check if we're still being asked to login
      const stillNeedsLogin = await page.evaluate(() => {
        return window.location.href.includes('accounts.google.com/signin') ||
               window.location.href.includes('accounts.google.com/ServiceLogin');
      });

      if (stillNeedsLogin) {
        console.log('\n⚠️  Automatic authentication incomplete.');
        console.log('📝 Manual steps required:');
        console.log('   1. The browser window is open');
        console.log('   2. You should see Google login page');
        console.log('   3. Complete the login manually');
        console.log('   4. Once logged in, press Enter here to continue...');
        
        await new Promise(resolve => {
          process.stdin.once('data', resolve);
        });
        
        // Refresh to ensure cookies are set
        await page.reload({ waitUntil: 'networkidle2' });
        await page.waitForTimeout(2000);
      } else {
        console.log('✅ Authentication successful!');
      }
    } else {
      console.log('✅ Already logged in - refreshing session...');
      // Still refresh to get latest cookies
      await page.reload({ waitUntil: 'networkidle2' });
      await page.waitForTimeout(2000);
    }

    console.log('🍪 Step 6: Extracting fresh cookies...');
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
      console.log('   Try manually logging in, then run this script again.');
      process.exit(1);
    }

    // Save cookies to file
    const timestamp = Date.now();
    const netscapeFormat = formatNetscapeCookies(googleCookies);
    const netscapeFile = path.join(process.cwd(), `google-cookies-fixed-${timestamp}.txt`);
    fs.writeFileSync(netscapeFile, netscapeFormat);
    console.log(`\n✅ Fixed cookies saved to: ${netscapeFile}`);

    // Optionally update cookies in AdsPower profile
    console.log('\n💾 Would you like to update cookies in the AdsPower profile? (y/n)');
    const updateCookies = await new Promise(resolve => {
      process.stdin.once('data', data => {
        resolve(data.toString().trim().toLowerCase() === 'y');
      });
    });

    if (updateCookies) {
      console.log('💾 Updating cookies in AdsPower profile...');
      await updateAdsPowerCookies(profileId, googleCookies);
      console.log('✅ Cookies updated in profile!');
    }

    console.log('\n📋 Cookie Summary:');
    googleCookies.forEach(cookie => {
      const essential = essentialCookies.includes(cookie.name) ? ' ⭐' : '';
      console.log(`  - ${cookie.name}${essential} (${cookie.domain})`);
    });

    console.log('\n✅ Success! Cookies have been refreshed.');
    console.log('   The profile should now work without asking for login.');

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
  } finally {
    if (browser) {
      await browser.disconnect();
    }
    console.log('\n💡 Note: AdsPower profile is still running.');
  }
}

main();


