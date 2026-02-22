# AdsPower API + Google Refresh Token Scripts

Scripts to fix failing Google cookies in AdsPower profiles using refresh tokens.

## Problem

You have Google cookies imported into AdsPower, but:
- Google asks for login
- Login fails
- Session doesn't work

## Solution

Use refresh tokens to re-authenticate and get fresh, working cookies.

---

## Script 1: Fix Failing Cookies (`google-refresh-fix-cookies.js`)

**Use this when:** You already have cookies but Google is asking for login.

This script:
1. Uses refresh token to get fresh access token
2. Opens AdsPower profile (with existing cookies)
3. Completes Google authentication when login is required
4. Extracts fresh, working cookies
5. Optionally updates cookies in the profile

## How It Works

1. **Exchanges refresh token** → Gets access token from Google
2. **Starts AdsPower profile** → Uses AdsPower API to launch browser
3. **Connects via CDP** → Uses Puppeteer to control the AdsPower browser
4. **Establishes Google session** → Uses access token to authenticate
5. **Extracts cookies** → Uses AdsPower API to get real session cookies

## Setup

### 1. Install Dependencies

```bash
npm install puppeteer-core axios
```

### 2. Configure AdsPower

1. Open AdsPower
2. Go to **Automation** > **API**
3. Enable Local API
4. Note your API key (if required)
5. Default API URL: `http://local.adspower.net:50325`

### 3. Set Environment Variables

```bash
export ADSPOWER_API_KEY="your_api_key"  # Optional, if AdsPower requires it
export ADSPOWER_API_URL="http://local.adspower.net:50325"  # Default
export GOOGLE_CLIENT_ID="your_client_id"
export GOOGLE_CLIENT_SECRET="your_client_secret"
```

### 4. Get Profile ID

1. Open AdsPower
2. Go to **Profile Management**
3. Find your profile
4. Copy the **Profile ID** (user_id)

## Usage

```bash
node scripts/google-refresh-to-cookies-adspower.js <refresh_token> <profile_id>
```

### Example

```bash
node scripts/google-refresh-to-cookies-adspower.js \
  "1//09aF4XcE9sYwjCgYIARAAGAkSNgF-L9Ir2AzvTWLTecTO8jOmZId_sVUWeF9xJgA8fxFxwabk06hQYA2wmcy1RjOcv5jkrHwP4g:101756564782217401420" \
  "profile_12345"
```

## What Happens

1. Script exchanges refresh token for access token ✅
2. Starts your AdsPower profile browser ✅
3. Connects Puppeteer to control it ✅
4. Navigates to Google and tries to authenticate ✅
5. **May require manual login** - Browser window opens, you may need to complete login
6. Extracts cookies via AdsPower API ✅
7. Saves cookies in Netscape format for import ✅

## Output Files

- `google-cookies-adspower-{timestamp}.txt` - Netscape format (for AdsPower import)
- `google-cookies-adspower-{timestamp}.json` - JSON format (alternative)

## Advantages of This Approach

✅ **Real cookies** - Extracted from actual browser session  
✅ **AdsPower integration** - Uses AdsPower's own API  
✅ **Profile management** - Works with existing AdsPower profiles  
✅ **Cookie extraction** - Uses AdsPower's cookie API (more reliable)

## Limitations

⚠️ **Manual login may be required** - Google's OAuth flow is complex and may need manual completion  
⚠️ **API access** - Requires AdsPower Advanced plan or higher  
⚠️ **Rate limits** - AdsPower API has rate limits (1 req/sec per device)

## Troubleshooting

### "AdsPower API error"
- Make sure AdsPower is running
- Check API is enabled in AdsPower settings
- Verify API URL is correct
- Check if API key is required

### "No Google cookies found"
- Manually log in to Google in the AdsPower browser window
- Wait for the script to extract cookies
- Check that profile is actually logged in

### "Failed to connect to browser"
- Make sure AdsPower profile started successfully
- Check WebSocket endpoint is accessible
- Verify profile ID is correct

## Alternative: Manual Cookie Export

If automation doesn't work:

1. Use this script to start the AdsPower profile
2. Manually log in to Google in the browser
3. Use AdsPower's cookie export feature
4. Or use the script's cookie extraction after manual login

## AdsPower API Endpoints Used

- `POST /api/v1/browser/start` - Start browser profile
- `GET /api/v2/browser-profile/cookies` - Get cookies from profile
- `POST /api/v1/browser/stop` - Stop browser profile (optional)

## Next Steps

After getting cookies:

1. Import `.txt` file into other AdsPower profiles
2. Or use cookies programmatically via AdsPower API
3. Cookies are real session cookies - they'll work until they expire

