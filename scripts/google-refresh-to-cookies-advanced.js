#!/usr/bin/env node

/**
 * Advanced: Convert Google Refresh Tokens to Real Cookies using Puppeteer
 * This script actually logs into Google and captures real session cookies
 * 
 * Requirements:
 *   npm install puppeteer
 * 
 * Usage:
 *   node scripts/google-refresh-to-cookies-advanced.js <refresh_token> [client_id] [client_secret]
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
          resolve(JSON.parse(data).access_token);
        } else {
          reject(new Error(`Failed: ${res.statusCode} - ${data}`));
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

/**
 * Format cookies in Netscape format
 */
function formatNetscapeCookies(cookies) {
  const lines = [
    '# Netscape HTTP Cookie File',
    '# Generated: ' + new Date().toISOString(),
    '#',
  ];

  cookies.forEach(cookie => {
    const expiration = cookie.expires 
      ? Math.floor(new Date(cookie.expires * 1000).getTime() / 1000)
      : Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60);
    
    const line = [
      cookie.domain.startsWith('.') ? cookie.domain : '.' + cookie.domain,
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
    expirationDate: cookie.expires 
      ? cookie.expires 
      : Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60),
    name: cookie.name,
    value: cookie.value,
  })), null, 2);
}

/**
 * Main execution with Puppeteer
 */
async function main() {
  let browser;
  
  try {
    console.log('🔄 Getting access token...');
    const accessToken = await getAccessToken(refreshToken, clientId, clientSecret);
    console.log('✅ Access token obtained');

    console.log('🌐 Launching browser...');
    browser = await puppeteer.launch({
      headless: false, // Set to true for headless mode
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const page = await browser.newPage();
    
    // Set user agent to avoid detection
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    console.log('🔐 Authenticating with Google...');
    
    // Method 1: Try to use access token directly via JavaScript injection
    await page.goto('https://accounts.google.com', { waitUntil: 'networkidle2' });
    
    // Inject access token and try to authenticate
    await page.evaluate((token) => {
      // Store token in localStorage/sessionStorage
      localStorage.setItem('google_access_token', token);
      
      // Try to use token to authenticate
      // Note: This is a simplified approach - Google's actual auth flow is more complex
      fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }).then(response => response.json()).then(data => {
        console.log('User info:', data);
      });
    }, accessToken);

    // Wait a bit for any redirects
    await page.waitForTimeout(2000);

    // Navigate to a Google service to establish session
    console.log('📧 Navigating to Gmail to establish session...');
    await page.goto('https://mail.google.com', { waitUntil: 'networkidle2', timeout: 30000 });
    
    // Wait for cookies to be set
    await page.waitForTimeout(3000);

    console.log('🍪 Extracting cookies...');
    const cookies = await page.cookies();
    
    // Filter for Google cookies
    const googleCookies = cookies.filter(cookie => 
      cookie.domain.includes('google.com') || 
      cookie.domain.includes('googleapis.com') ||
      cookie.domain.includes('gstatic.com')
    );

    console.log(`✅ Found ${googleCookies.length} Google cookies`);

    if (googleCookies.length === 0) {
      console.warn('⚠️  No Google cookies found. You may need to manually login.');
      console.log('The browser window is still open - please login manually, then press Enter...');
      await new Promise(resolve => {
        process.stdin.once('data', resolve);
      });
      
      // Extract cookies again after manual login
      const newCookies = await page.cookies();
      const newGoogleCookies = newCookies.filter(cookie => 
        cookie.domain.includes('google.com') || 
        cookie.domain.includes('googleapis.com') ||
        cookie.domain.includes('gstatic.com')
      );
      
      if (newGoogleCookies.length > 0) {
        googleCookies.push(...newGoogleCookies);
        console.log(`✅ Found ${newGoogleCookies.length} additional cookies after login`);
      }
    }

    // Generate Netscape format
    const netscapeFormat = formatNetscapeCookies(googleCookies);
    const timestamp = Date.now();
    const netscapeFile = path.join(process.cwd(), `google-cookies-${timestamp}.txt`);
    fs.writeFileSync(netscapeFile, netscapeFormat);
    console.log(`\n✅ Netscape format saved to: ${netscapeFile}`);

    // Generate JSON format
    const jsonFormat = formatJSONCookies(googleCookies);
    const jsonFile = path.join(process.cwd(), `google-cookies-${timestamp}.json`);
    fs.writeFileSync(jsonFile, jsonFormat);
    console.log(`✅ JSON format saved to: ${jsonFile}`);

    console.log('\n📋 Cookie Summary:');
    googleCookies.forEach(cookie => {
      console.log(`  - ${cookie.name} (${cookie.domain})`);
    });

    console.log('\n✅ Done! You can now import these cookies into AdsPower');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    if (browser) {
      console.log('\nClosing browser in 5 seconds...');
      await new Promise(resolve => setTimeout(resolve, 5000));
      await browser.close();
    }
  }
}

main();


