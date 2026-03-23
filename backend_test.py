import requests
import sys
import json
from datetime import datetime

class POSBackendTester:
    def __init__(self, base_url="https://pos-builder-1.preview.emergentagent.com"):
        self.base_url = base_url
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []

    def run_test(self, name, method, endpoint, expected_status, data=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=10)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    print(f"Response: {json.dumps(response_data, indent=2)}")
                except:
                    print(f"Response: {response.text}")
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                print(f"Response: {response.text}")
                self.failed_tests.append({
                    "test": name,
                    "expected": expected_status,
                    "actual": response.status_code,
                    "response": response.text
                })

            return success, response.json() if success and response.text else {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            self.failed_tests.append({
                "test": name,
                "error": str(e)
            })
            return False, {}

    def test_root_endpoint(self):
        """Test the root API endpoint"""
        return self.run_test(
            "Root API Endpoint",
            "GET",
            "api/",
            200
        )

    def test_create_status_check(self):
        """Test creating a status check"""
        test_data = {
            "client_name": f"test_client_{datetime.now().strftime('%H%M%S')}"
        }
        success, response = self.run_test(
            "Create Status Check",
            "POST",
            "api/status",
            200,
            data=test_data
        )
        return success, response

    def test_get_status_checks(self):
        """Test getting status checks"""
        return self.run_test(
            "Get Status Checks",
            "GET",
            "api/status",
            200
        )

    def test_invalid_endpoint(self):
        """Test invalid endpoint returns 404"""
        return self.run_test(
            "Invalid Endpoint",
            "GET",
            "api/invalid",
            404
        )

def main():
    print("🚀 Starting POS Backend API Tests...")
    print("=" * 50)
    
    # Setup
    tester = POSBackendTester()

    # Run tests
    print("\n📋 Testing Basic API Endpoints...")
    
    # Test root endpoint
    tester.test_root_endpoint()
    
    # Test status check creation
    success, created_status = tester.test_create_status_check()
    
    # Test getting status checks
    tester.test_get_status_checks()
    
    # Test invalid endpoint
    tester.test_invalid_endpoint()

    # Print results
    print("\n" + "=" * 50)
    print(f"📊 Test Results: {tester.tests_passed}/{tester.tests_run} passed")
    
    if tester.failed_tests:
        print("\n❌ Failed Tests:")
        for failed in tester.failed_tests:
            if 'error' in failed:
                print(f"  - {failed.get('test', 'Unknown')}: {failed['error']}")
            else:
                print(f"  - {failed.get('test', 'Unknown')}: Expected {failed.get('expected')}, got {failed.get('actual')}")
    
    return 0 if tester.tests_passed == tester.tests_run else 1

if __name__ == "__main__":
    sys.exit(main())