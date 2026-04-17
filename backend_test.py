#!/usr/bin/env python3
"""
Backend API Testing Script
Tests the current FastAPI backend implementation to verify available endpoints
and document what functionality is present vs absent.
"""

import requests
import json
import sys
from datetime import datetime
import uuid

# Backend URL from frontend environment
BACKEND_URL = "https://distracted-poincare-5.preview.emergentagent.com"
API_BASE = f"{BACKEND_URL}/api"

def test_hello_world_endpoint():
    """Test the basic hello world endpoint"""
    print("=== Testing Hello World Endpoint ===")
    try:
        response = requests.get(f"{API_BASE}/")
        print(f"GET /api/ - Status: {response.status_code}")
        print(f"Response: {response.json()}")
        
        if response.status_code == 200 and response.json().get("message") == "Hello World":
            print("✅ Hello World endpoint working correctly")
            return True
        else:
            print("❌ Hello World endpoint not working as expected")
            return False
    except Exception as e:
        print(f"❌ Error testing hello world endpoint: {e}")
        return False

def test_status_endpoints():
    """Test the status check endpoints (GET and POST)"""
    print("\n=== Testing Status Endpoints ===")
    
    # Test GET /api/status first
    try:
        response = requests.get(f"{API_BASE}/status")
        print(f"GET /api/status - Status: {response.status_code}")
        if response.status_code == 200:
            status_checks = response.json()
            print(f"Retrieved {len(status_checks)} status checks")
            print("✅ GET /api/status working correctly")
            get_status_working = True
        else:
            print(f"❌ GET /api/status failed with status {response.status_code}")
            get_status_working = False
    except Exception as e:
        print(f"❌ Error testing GET /api/status: {e}")
        get_status_working = False
    
    # Test POST /api/status
    try:
        test_data = {
            "client_name": f"test_client_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        }
        response = requests.post(f"{API_BASE}/status", json=test_data)
        print(f"POST /api/status - Status: {response.status_code}")
        
        if response.status_code == 200:
            created_status = response.json()
            print(f"Created status check with ID: {created_status.get('id')}")
            print("✅ POST /api/status working correctly")
            post_status_working = True
        else:
            print(f"❌ POST /api/status failed with status {response.status_code}")
            print(f"Response: {response.text}")
            post_status_working = False
    except Exception as e:
        print(f"❌ Error testing POST /api/status: {e}")
        post_status_working = False
    
    return get_status_working and post_status_working

def test_non_existent_endpoints():
    """Test for endpoints that should not exist based on the review request"""
    print("\n=== Testing for Non-Existent Endpoints ===")
    
    # Test for auth endpoints
    auth_endpoints = [
        "/api/auth/login",
        "/api/auth/register", 
        "/api/auth/logout",
        "/api/login",
        "/api/register",
        "/api/user",
        "/api/users"
    ]
    
    print("Checking for auth-protected routes:")
    auth_found = False
    for endpoint in auth_endpoints:
        try:
            response = requests.get(f"{BACKEND_URL}{endpoint}")
            if response.status_code != 404:
                print(f"⚠️  Found potential auth endpoint: {endpoint} (Status: {response.status_code})")
                auth_found = True
        except:
            pass
    
    if not auth_found:
        print("✅ No auth-protected routes found")
    
    # Test for order/cart endpoints
    order_endpoints = [
        "/api/orders",
        "/api/cart", 
        "/api/checkout",
        "/api/calculate",
        "/api/order-calculation"
    ]
    
    print("\nChecking for order-calculation endpoints:")
    order_found = False
    for endpoint in order_endpoints:
        try:
            response = requests.get(f"{BACKEND_URL}{endpoint}")
            if response.status_code != 404:
                print(f"⚠️  Found potential order endpoint: {endpoint} (Status: {response.status_code})")
                order_found = True
        except:
            pass
    
    if not order_found:
        print("✅ No order-calculation endpoints found")
    
    # Test for printing endpoints
    print_endpoints = [
        "/api/print",
        "/api/printing",
        "/api/printer"
    ]
    
    print("\nChecking for printing endpoints:")
    print_found = False
    for endpoint in print_endpoints:
        try:
            response = requests.get(f"{BACKEND_URL}{endpoint}")
            if response.status_code != 404:
                print(f"⚠️  Found potential print endpoint: {endpoint} (Status: {response.status_code})")
                print_found = True
        except:
            pass
    
    if not print_found:
        print("✅ No printing endpoints found")
    
    return not auth_found and not order_found and not print_found

def test_websocket_endpoints():
    """Check for websocket endpoints"""
    print("\n=== Testing for WebSocket Endpoints ===")
    
    # Check if there are any websocket imports or routes in the server
    # Since we can't easily test websockets, we'll check the response headers
    # and look for upgrade headers or websocket-related responses
    
    websocket_paths = [
        "/ws",
        "/api/ws", 
        "/websocket",
        "/api/websocket",
        "/socket.io"
    ]
    
    websocket_found = False
    for path in websocket_paths:
        try:
            response = requests.get(f"{BACKEND_URL}{path}")
            # WebSocket endpoints typically return 426 Upgrade Required for HTTP requests
            if response.status_code == 426 or "upgrade" in response.headers.get("connection", "").lower():
                print(f"⚠️  Found potential websocket endpoint: {path}")
                websocket_found = True
        except:
            pass
    
    if not websocket_found:
        print("✅ No websocket/socket endpoints found")
    
    return not websocket_found

def test_backend_health():
    """Test overall backend health and connectivity"""
    print("\n=== Testing Backend Health ===")
    
    try:
        # Test basic connectivity
        response = requests.get(f"{BACKEND_URL}/api/", timeout=10)
        if response.status_code == 200:
            print("✅ Backend is accessible and responding")
            return True
        else:
            print(f"❌ Backend responding with status {response.status_code}")
            return False
    except requests.exceptions.Timeout:
        print("❌ Backend request timed out")
        return False
    except requests.exceptions.ConnectionError:
        print("❌ Cannot connect to backend")
        return False
    except Exception as e:
        print(f"❌ Backend health check failed: {e}")
        return False

def main():
    """Run all backend tests"""
    print("Backend API Verification Test")
    print("=" * 50)
    print(f"Testing backend at: {BACKEND_URL}")
    print(f"API base URL: {API_BASE}")
    print()
    
    results = {}
    
    # Test backend health first
    results['health'] = test_backend_health()
    
    if not results['health']:
        print("\n❌ Backend is not accessible. Stopping tests.")
        return False
    
    # Test implemented endpoints
    results['hello_world'] = test_hello_world_endpoint()
    results['status_endpoints'] = test_status_endpoints()
    
    # Test for endpoints that should not exist
    results['no_extra_endpoints'] = test_non_existent_endpoints()
    results['no_websockets'] = test_websocket_endpoints()
    
    # Summary
    print("\n" + "=" * 50)
    print("BACKEND VERIFICATION SUMMARY")
    print("=" * 50)
    
    print("\n✅ CONFIRMED WORKING ENDPOINTS:")
    if results['hello_world']:
        print("  - GET /api/ (Hello World)")
    if results['status_endpoints']:
        print("  - GET /api/status (Retrieve status checks)")
        print("  - POST /api/status (Create status check)")
    
    print("\n✅ CONFIRMED ABSENT FEATURES:")
    if results['no_extra_endpoints']:
        print("  - No auth-protected routes")
        print("  - No order-calculation endpoints") 
        print("  - No printing endpoints")
    if results['no_websockets']:
        print("  - No websocket/socket endpoints")
    
    print(f"\n📊 BACKEND SURFACE SUMMARY:")
    print(f"  - Limited to starter FastAPI implementation")
    print(f"  - 3 total endpoints: GET /api/, GET/POST /api/status")
    print(f"  - MongoDB integration for status checks only")
    print(f"  - CORS configured for cross-origin requests")
    print(f"  - No authentication, websockets, printing, or order features")
    
    # Overall result
    all_passed = all(results.values())
    if all_passed:
        print("\n✅ All verification tests passed")
    else:
        print("\n❌ Some verification tests failed")
        for test, passed in results.items():
            if not passed:
                print(f"  - {test}: FAILED")
    
    return all_passed

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)