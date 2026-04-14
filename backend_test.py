#!/usr/bin/env python3
"""
Backend API Test for MyGenie POS CRM Integration
Tests CRM customer search and address lookup functionality
"""

import requests
import sys
import json
from datetime import datetime

class CRMAPITester:
    def __init__(self):
        # CRM API configuration from frontend .env
        self.crm_base_url = "https://react-mongo-crm.preview.emergentagent.com/api"
        self.restaurant_id = "509"  # Pav & Pages Cafe
        self.api_key = "dp_live_zSGgRVoIK5Oxf_W6pcA7Tn-3kahRDx13cQF1r7f0Xcw"
        
        self.headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'X-API-Key': self.api_key
        }
        
        self.tests_run = 0
        self.tests_passed = 0

    def run_test(self, name, method, endpoint, expected_status, data=None, params=None):
        """Run a single API test"""
        url = f"{self.crm_base_url}/{endpoint}"
        
        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        if params:
            print(f"   Params: {params}")
        if data:
            print(f"   Data: {json.dumps(data, indent=2)}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=self.headers, params=params, timeout=10)
            elif method == 'POST':
                response = requests.post(url, headers=self.headers, json=data, timeout=10)
            
            print(f"   Status: {response.status_code}")
            
            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                
                # Print response data if successful
                try:
                    response_data = response.json()
                    if response_data.get('success'):
                        if 'customers' in response_data.get('data', {}):
                            customers = response_data['data']['customers']
                            print(f"   Found {len(customers)} customers")
                            for i, customer in enumerate(customers[:3]):  # Show first 3
                                print(f"   Customer {i+1}: {customer.get('name', 'N/A')} - {customer.get('phone', 'N/A')}")
                        elif 'addresses' in response_data.get('data', {}):
                            addresses = response_data['data']['addresses']
                            print(f"   Found {len(addresses)} addresses")
                            for i, addr in enumerate(addresses[:3]):  # Show first 3
                                print(f"   Address {i+1}: {addr.get('address', 'N/A')} - {addr.get('city', 'N/A')}")
                        else:
                            print(f"   Response: {json.dumps(response_data, indent=2)}")
                    else:
                        print(f"   API returned success=false: {response_data}")
                except:
                    print(f"   Raw response: {response.text[:200]}...")
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                print(f"   Error: {response.text[:200]}...")

            return success, response.json() if response.headers.get('content-type', '').startswith('application/json') else {}

        except requests.exceptions.Timeout:
            print(f"❌ Failed - Request timeout")
            return False, {}
        except requests.exceptions.ConnectionError:
            print(f"❌ Failed - Connection error")
            return False, {}
        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_customer_search_by_phone(self):
        """Test customer search by phone number"""
        return self.run_test(
            "Customer Search by Phone '7505242126'",
            "GET",
            "pos/customers",
            200,
            params={"search": "7505242126", "limit": 10}
        )

    def test_customer_search_by_name(self):
        """Test customer search by name"""
        return self.run_test(
            "Customer Search by Name 'Abhishek'",
            "GET",
            "pos/customers",
            200,
            params={"search": "Abhishek", "limit": 10}
        )

    def test_customer_search_short_query(self):
        """Test customer search with short query (should still work but return fewer results)"""
        return self.run_test(
            "Customer Search with Short Query 'A'",
            "GET",
            "pos/customers",
            200,
            params={"search": "A", "limit": 5}
        )

    def test_customer_lookup_by_phone(self):
        """Test customer lookup by exact phone"""
        return self.run_test(
            "Customer Lookup by Phone '7505242126'",
            "POST",
            "pos/customer-lookup",
            200,
            data={"phone": "7505242126"}
        )

    def test_address_lookup_by_phone(self):
        """Test address lookup by phone"""
        return self.run_test(
            "Address Lookup by Phone '7505242126'",
            "POST",
            "pos/address-lookup",
            200,
            data={"phone": "7505242126"}
        )

    def test_api_key_validation(self):
        """Test API with invalid key"""
        original_key = self.headers['X-API-Key']
        self.headers['X-API-Key'] = "invalid_key"
        
        success, _ = self.run_test(
            "API Key Validation (Invalid Key)",
            "GET",
            "pos/customers",
            401,  # Expect unauthorized
            params={"search": "test", "limit": 1}
        )
        
        # Restore original key
        self.headers['X-API-Key'] = original_key
        return success, {}

def main():
    print("=== MyGenie POS CRM API Integration Test ===")
    print(f"Test started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"CRM Base URL: https://react-mongo-crm.preview.emergentagent.com/api")
    print(f"Restaurant ID: 509 (Pav & Pages Cafe)")
    print("=" * 60)

    tester = CRMAPITester()

    # Run all tests
    print("\n🧪 Running CRM API Tests...")
    
    # Test 1: Customer search by phone (main test case)
    tester.test_customer_search_by_phone()
    
    # Test 2: Customer search by name (main test case)
    tester.test_customer_search_by_name()
    
    # Test 3: Customer search with short query
    tester.test_customer_search_short_query()
    
    # Test 4: Customer lookup by phone
    tester.test_customer_lookup_by_phone()
    
    # Test 5: Address lookup by phone
    tester.test_address_lookup_by_phone()
    
    # Test 6: API key validation
    tester.test_api_key_validation()

    # Print summary
    print("\n" + "=" * 60)
    print(f"📊 Test Summary:")
    print(f"   Tests Run: {tester.tests_run}")
    print(f"   Tests Passed: {tester.tests_passed}")
    print(f"   Tests Failed: {tester.tests_run - tester.tests_passed}")
    print(f"   Success Rate: {(tester.tests_passed / tester.tests_run * 100):.1f}%")
    
    if tester.tests_passed == tester.tests_run:
        print("🎉 All tests passed!")
        return 0
    else:
        print("⚠️ Some tests failed. Check the details above.")
        return 1

if __name__ == "__main__":
    sys.exit(main())