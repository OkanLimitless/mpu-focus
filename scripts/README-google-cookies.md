# Google Refresh Token to Cookies Converter

Scripts to convert Google OAuth refresh tokens into cookie files that can be imported into AdsPower.

## Quick Start

### Basic Script (Generates placeholder cookies)

```bash
# Set environment variables
export GOOGLE_CLIENT_ID="your_client_id"
export GOOGLE_CLIENT_SECRET="your_client_secret"

# Run script
node scripts/google-refresh-to-cookies.js "1//09aF4XcE9sYwjCgYIARAAGAkSNgF-L9Ir2AzvTWLTecTO8jOmZId_sVUWeF9xJgA8fxFxwabk06hQYA2wmcy1RjOcv5jkrHwP4g:101756564782217401420"
```

**Output:**
- `google-cookies-{timestamp}.txt` - Netscape format (for AdsPower)
- `google-cookies-{timestamp}.json` - JSON format (alternative)

### Advanced Script (Captures real cookies using browser automation)

**First, install Puppeteer:**
```bash
npm install puppeteer
```

**Then run:**
```bash
node scripts/google-refresh-to-cookies-advanced.js "your_refresh_token"
```

This script:
1. Launches a browser
2. Uses the refresh token to authenticate
3. Captures real Google session cookies
4. Exports them in Netscape format

## Important Notes

### ⚠️ Limitations

1. **Basic Script**: Generates placeholder cookies that may not work directly. Google's actual authentication requires real session cookies from an active login.

2. **Advanced Script**: Uses browser automation to get real cookies, but Google's authentication flow is complex and may require manual intervention.

### 🔐 Best Practice Approach

For AdsPower, the most reliable method is:

1. **Use the advanced script** to get an access token
2. **Manually login** in the AdsPower browser profile:
   - Open AdsPower profile
   - Navigate to `accounts.google.com`
   - Use a cookie editor extension to inject the access token
   - Complete the login flow
   - Export cookies from the browser

3. **Or use browser automation** (Puppeteer/Playwright) to:
   - Exchange refresh token → access token
   - Navigate to Google login
   - Complete authentication flow
   - Extract all cookies
   - Import into AdsPower

## Importing into AdsPower

1. Open AdsPower
2. Select your profile → Edit
3. Go to "Account" or "Cookie" section
4. Click "Import Cookie"
5. Select the generated `.txt` file (Netscape format)
6. Save and launch the profile

## Troubleshooting

- **"Invalid cookie format"**: Make sure you're using Netscape format (`.txt` file)
- **"Cookies expired"**: Cookies may expire quickly - try the advanced script to get fresh ones
- **"Login still required"**: Google may require additional authentication - use the advanced script with manual login option


