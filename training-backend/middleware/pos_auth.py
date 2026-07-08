# CR-053: POS Auth middleware — validates Bearer token via POS API
import httpx
import os
import logging
from fastapi import Request, HTTPException
from functools import lru_cache
import time

logger = logging.getLogger(__name__)

# Simple in-memory cache for token validation (avoids calling POS API every request)
_token_cache = {}  # token -> (profile, expiry_timestamp)
CACHE_TTL_SECONDS = 900  # 15 minutes


async def validate_pos_token(token: str) -> dict:
    """Validate POS Bearer token by calling the POS profile API."""
    # Check cache first
    cached = _token_cache.get(token)
    if cached and cached[1] > time.time():
        return cached[0]

    pos_api_url = os.environ.get("POS_API_BASE_URL", "https://preprod.mygenie.online")
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            # Try vendoremployee profile first
            resp = await client.get(
                f"{pos_api_url}/api/v1/vendoremployee/profile",
                headers={"Authorization": f"Bearer {token}"}
            )
            if resp.status_code == 200:
                data = resp.json()
                # POS profile API returns data at top level or under "data" key
                profile_data = data.get("data", data)
                # Extract restaurant_id from restaurants array
                rest_id = 0
                if isinstance(profile_data.get("restaurants"), list) and profile_data["restaurants"]:
                    rest_id = profile_data["restaurants"][0].get("id", 0)
                if not rest_id:
                    rest_id = profile_data.get("restaurant_id", 0)
                # Extract role — role_name is the clean field
                role = profile_data.get("role_name", "staff").lower()
                # Extract employee identity
                profile = {
                    "employee_id": profile_data.get("emp_id", profile_data.get("id", 0)),
                    "restaurant_id": rest_id,
                    "role": role,
                    "name": profile_data.get("emp_f_name", profile_data.get("f_name", "Unknown")),
                    "email": profile_data.get("emp_email", profile_data.get("email", "")),
                    "restaurant_name": profile_data["restaurants"][0].get("name", "") if isinstance(profile_data.get("restaurants"), list) and profile_data["restaurants"] else "",
                }
                # Cache it
                _token_cache[token] = (profile, time.time() + CACHE_TTL_SECONDS)
                return profile
            else:
                logger.warning(f"POS API returned {resp.status_code} for token validation")
                raise HTTPException(status_code=401, detail="Invalid POS token")
    except httpx.RequestError as e:
        logger.error(f"POS API connection error: {e}")
        raise HTTPException(status_code=503, detail="POS API unavailable")


async def get_current_employee(request: Request) -> dict:
    """Extract and validate employee identity from POS Bearer token."""
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing Bearer token")
    token = auth_header.split("Bearer ", 1)[1]
    return await validate_pos_token(token)
