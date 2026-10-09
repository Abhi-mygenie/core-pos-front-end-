#!/usr/bin/env python3
"""
CR-418: One-time OAuth2 refresh token generator.
Run this script, follow the URL, paste the code, get your refresh token.
Add the token to /app/frontend/.env as GOOGLE_REFRESH_TOKEN=<token>

Usage: python3 get_refresh_token.py
"""

import sys
try:
    import requests
    from dotenv import load_dotenv
except ImportError:
    sys.exit("Run: pip install requests python-dotenv")

import os
from pathlib import Path

load_dotenv('/app/frontend/.env')

CLIENT_ID     = os.getenv('GOOGLE_OAUTH_CLIENT_ID', '').strip().strip('"').strip("'")
CLIENT_SECRET = os.getenv('GOOGLE_OAUTH_CLIENT_SECRET', '').strip().strip('"').strip("'")

if not CLIENT_ID or not CLIENT_SECRET:
    sys.exit("❌ CLIENT_ID or CLIENT_SECRET missing from /app/frontend/.env")

SCOPE        = 'https://www.googleapis.com/auth/spreadsheets'
REDIRECT_URI = 'urn:ietf:wg:oauth:2.0:oob'   # Out-of-band — no local server needed

auth_url = (
    f"https://accounts.google.com/o/oauth2/auth"
    f"?client_id={CLIENT_ID}"
    f"&redirect_uri={REDIRECT_URI}"
    f"&scope={SCOPE}"
    f"&response_type=code"
    f"&access_type=offline"
    f"&prompt=consent"
)

print("\n" + "="*60)
print("  Step 1: Open this URL in your browser and sign in:")
print("="*60)
print(f"\n{auth_url}\n")
print("="*60)
print("  Step 2: After signing in, Google will show a code.")
print("  Paste it here:")
print("="*60 + "\n")

code = input("Authorization code: ").strip()

r = requests.post('https://oauth2.googleapis.com/token', data={
    'code':          code,
    'client_id':     CLIENT_ID,
    'client_secret': CLIENT_SECRET,
    'redirect_uri':  REDIRECT_URI,
    'grant_type':    'authorization_code',
}, timeout=15)

data = r.json()
if 'refresh_token' not in data:
    print(f"❌ Failed: {data}")
    sys.exit(1)

refresh_token = data['refresh_token']
print(f"\n✅ Refresh token obtained!\n")
print(f"Add this line to /app/frontend/.env:\n")
print(f"GOOGLE_REFRESH_TOKEN={refresh_token}\n")
