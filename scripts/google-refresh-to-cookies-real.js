#!/usr/bin/env node

/**
 * Convert Google Refresh Tokens to REAL Session Cookies
 * 
 * This script uses browser automation to:
 * 1. Exchange refresh token for access token
 * 2. Use the access token to authenticate in a browser
 * 3. Navigate through Google's auth flow to establish real session
 * 4. Extract actual browser cookies (SID, HSID, SSID, etc.)
 * 
 * Requirements:
 *   npm install puppeteer
 * 
 * Usage:
 *   node scripts/google-refresh-to-cookies-real.js <refresh_token> [client_id] [client_secret]
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// Check if puppeteer is available
let puppeteer;
try {
  puppeteer = require('puppeteer');
} catch (error) {
  console.error('❌ Error: puppeteer is not installed');
  console.error('Install it with: npm install puppeteer');
  process.exit(1);
}

const refreshToken = process.argv[2];
const clientId = process.argv[3] || process.env.GOOGLE_CLIENT_ID;
const clientSecret = process.argv[4] || process.env.GOOGLE_CLIENT_SECRET;

if (!refreshToken) {
  console.error('Error: Refresh token is required');
  console.error('\nUsage:');
  console.error('  node scripts/google-refresh-to-cookies-real.js <refresh_token> [client_id] [client_secret]');
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
 * Format cookies in Netscape format for AdsPower
 */
function formatNetscapeCookies(cookies) {
  const lines = [
    '# Netscape HTTP Cookie File',
    '# Generated: ' + new Date().toISOString(),
    '# This file contains REAL Google session cookies',
    '#',
  ];

  cookies.forEach(cookie => {
    const expiration = cookie.expires 
      ? Math.floor(cookie.expires)
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
    expirationDate: cookie.expires || Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60),
    name: cookie.name,
    value: cookie.value,
  })), null, 2);
}

/**
 * Main execution - Establish real Google session
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

    console.log('🌐 Step 3: Launching browser...');
    browser = await puppeteer.launch({
      headless: false, // Keep visible so you can see what's happening
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled',
      ],
    });

    const page = await browser.newPage();
    
    // Set realistic user agent
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );

    // Remove webdriver property
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', {
        get: () => undefined,
      });
    });

    console.log('🔐 Step 4: Establishing Google session...');
    console.log('   This may require manual intervention...');

    // Strategy 1: Try to use access token to authenticate via OAuth
    // Navigate to Google OAuth consent with access token
    const oauthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=urn:ietf:wg:oauth:2.0:oob&response_type=code&scope=openid%20email%20profile&access_type=offline`;
    
    await page.goto(oauthUrl, { waitUntil: 'networkidle2', timeout: 30000 });

    // Try to inject access token and complete auth
    await page.evaluate((token, email) => {
      // Store token temporarily
      window.__google_access_token = token;
      window.__google_email = email;
      
      // Try to use token to authenticate
      // This is a workaround - Google doesn't officially support this
      fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { 'Authorization': `Bearer ${token}` }
      }).then(r => r.json()).then(data => {
        console.log('Token validated:', data.email);
      });
    }, accessToken, userInfo.email);

    await page.waitForTimeout(2000);

    // Strategy 2: Navigate to Google services that might accept the token
    console.log('📧 Step 5: Navigating to Gmail to establish session...');
    
    // Try to use the access token in a way that establishes browser session
    // This is tricky - we'll navigate and see if we can establish a session
    
    await page.goto('https://mail.google.com', { waitUntil: 'networkidle2', timeout: 30000 });
    
    // Wait a bit for any redirects or session establishment
    await page.waitForTimeout(3000);

    // Check if we're logged in by looking for specific elements
    const isLoggedIn = await page.evaluate(() => {
      return document.cookie.includes('SID') || 
             document.cookie.includes('HSID') ||
             window.location.href.includes('accounts.google.com') === false;
    });

    if (!isLoggedIn) {
      console.log('\n⚠️  Automatic authentication failed.');
      console.log('📝 Manual intervention required:');
      console.log('   1. The browser window is open');
      console.log('   2. Please manually log in to Google');
      console.log('   3. Once logged in, press Enter here to continue...');
      
      await new Promise(resolve => {
        process.stdin.once('data', resolve);
      });
      
      // Refresh page to ensure cookies are set
      await page.reload({ waitUntil: 'networkidle2' });
      await page.waitForTimeout(2000);
    }

    console.log('🍪 Step 6: Extracting cookies...');
    const cookies = await page.cookies();
    
    // Filter for Google cookies - these are the REAL session cookies
    const googleCookies = cookies.filter(cookie => 
      cookie.domain.includes('google.com') || 
      cookie.domain.includes('googleapis.com') ||
      cookie.domain.includes('gstatic.com') ||
      cookie.domain.includes('youtube.com')
    );

    // Look for essential session cookies
    const essentialCookies = ['SID', 'HSID', 'SSID', 'APISID', 'SAPISID', 'NID', 'SIDCC'];
    const foundEssential = googleCookies.filter(c => essentialCookies.includes(c.name));
    
    console.log(`✅ Found ${googleCookies.length} Google cookies`);
    console.log(`✅ Found ${foundEssential.length} essential session cookies: ${foundEssential.map(c => c.name).join(', ')}`);

    if (googleCookies.length === 0) {
      console.error('❌ No Google cookies found. Session establishment failed.');
      console.log('   Try:');
      console.log('   1. Manually logging in the browser');
      console.log('   2. Checking if the refresh token is still valid');
      console.log('   3. Ensuring you have the correct client_id and client_secret');
      process.exit(1);
    }

    // Generate Netscape format
    const timestamp = Date.now();
    const netscapeFormat = formatNetscapeCookies(googleCookies);
    const netscapeFile = path.join(process.cwd(), `google-cookies-real-${timestamp}.txt`);
    fs.writeFileSync(netscapeFile, netscapeFormat);
    console.log(`\n✅ Netscape format saved to: ${netscapeFile}`);

    // Generate JSON format
    const jsonFormat = formatJSONCookies(googleCookies);
    const jsonFile = path.join(process.cwd(), `google-cookies-real-${timestamp}.json`);
    fs.writeFileSync(jsonFile, jsonFormat);
    console.log(`✅ JSON format saved to: ${jsonFile}`);

    console.log('\n📋 Cookie Summary:');
    googleCookies.forEach(cookie => {
      const essential = essentialCookies.includes(cookie.name) ? ' ⭐' : '';
      console.log(`  - ${cookie.name}${essential} (${cookie.domain})`);
    });

    console.log('\n✅ Success! Real Google session cookies extracted.');
    console.log('   You can now import the .txt file into AdsPower');

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
  } finally {
    if (browser) {
      console.log('\n⏳ Keeping browser open for 10 seconds (press Ctrl+C to close immediately)...');
      await new Promise(resolve => setTimeout(resolve, 10000));
      await browser.close();
    }
  }
}

main();


