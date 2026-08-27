/**
 * =============================================================================
 * Standalone Gmail OAuth 2.0 Token Generator (CommonJS / CLI Flow)
 * =============================================================================
 *
 * Usage:
 *   node scripts/get_gmail_tokens.cjs
 * =============================================================================
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');
require('dotenv').config();
const { google } = require('googleapis');

const CLIENT_ID = process.env.GMAIL_CLIENT_ID;
const CLIENT_SECRET = process.env.GMAIL_CLIENT_SECRET;
const REDIRECT_URI = 'urn:ietf:wg:oauth:2.0:oob';

const SCOPES = [
  'https://mail.google.com/',
  'https://www.googleapis.com/auth/gmail.modify',
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.send',
];

async function main() {
  console.log('\n======================================================');
  console.log('       Gmail API OAuth 2.0 Token Generator (OOB)      ');
  console.log('======================================================\n');

  if (!CLIENT_ID || !CLIENT_SECRET) {
    console.error('❌ Error: Missing credentials in .env file!');
    console.error('Please ensure the following variables are defined:');
    console.error('  - GMAIL_CLIENT_ID');
    console.error('  - GMAIL_CLIENT_SECRET\n');
    console.error('Example .env entry:');
    console.error('  GMAIL_CLIENT_ID=your-client-id.apps.googleusercontent.com');
    console.error('  GMAIL_CLIENT_SECRET=GOCSPX-your-client-secret\n');
    process.exit(1);
  }

  const oauth2Client = new google.auth.OAuth2(
    CLIENT_ID,
    CLIENT_SECRET,
    REDIRECT_URI
  );

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: SCOPES,
  });

  console.log('👉 Step 1: Open the following URL in your browser:\n');
  console.log('------------------------------------------------------');
  console.log(authUrl);
  console.log('------------------------------------------------------\n');
  console.log('👉 Step 2: Log in with your Google / Gmail account, grant permissions,');
  console.log('           and copy the authorization code displayed on the screen.\n');

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  rl.question('👉 Step 3: Paste the authorization code here: ', async (rawCode) => {
    rl.close();
    const code = (rawCode || '').trim();

    if (!code) {
      console.error('\n❌ Error: No authorization code was provided.');
      process.exit(1);
    }

    console.log('\n⏳ Exchanging authorization code for tokens...');

    try {
      const { tokens } = await oauth2Client.getToken(code);

      console.log('\n✅ Successfully acquired OAuth 2.0 tokens!\n');
      console.log('================== TOKEN CREDENTIALS ==================');
      console.log(`GMAIL_ACCESS_TOKEN  : ${tokens.access_token}`);
      console.log(`GMAIL_REFRESH_TOKEN : ${tokens.refresh_token || '(No new refresh token provided — prior refresh token remains valid)'}`);
      console.log(`GMAIL_TOKEN_EXPIRY  : ${tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : 'N/A'}`);
      console.log(`GMAIL_TOKEN_TYPE    : ${tokens.token_type || 'Bearer'}`);
      console.log('=======================================================\n');

      const tokenFilePath = path.resolve(process.cwd(), '.gmail-tokens.json');
      const tokenPayload = {
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expiry_date: tokens.expiry_date,
        token_type: tokens.token_type,
        scope: tokens.scope,
        updated_at: new Date().toISOString(),
      };

      fs.writeFileSync(tokenFilePath, JSON.stringify(tokenPayload, null, 2), 'utf-8');
      console.log(`💾 Saved token payload to: ${tokenFilePath}`);
      console.log('👉 You can copy the GMAIL_REFRESH_TOKEN into your .env or production secret store.\n');

    } catch (err) {
      console.error('\n❌ Token exchange failed!');
      console.error('Details:', err?.message || err);
      if (err?.response?.data) {
        console.error('OAuth Error Response:', JSON.stringify(err.response.data, null, 2));
      }
      console.error('\nTroubleshooting Tips:');
      console.error('1. Make sure your OAuth Client in Google Cloud Console is configured as "Desktop App".');
      console.error('2. Make sure the code was pasted accurately without extra spaces or line breaks.');
      console.error('3. Authorization codes expire within a few minutes; generate a new one if needed.');
      process.exit(1);
    }
  });
}

main().catch((err) => {
  console.error('Unexpected script error:', err);
  process.exit(1);
});
