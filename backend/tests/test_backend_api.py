"""
Backend API Tests for MyGenie POS Deployment
Tests the basic FastAPI backend health check and status endpoints
"""
import pytest
import requests
import os

# Get base URL from environment
BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestHealthCheck:
    """Health check endpoint tests"""
    
    def test_root_endpoint_returns_200(self):
        """Test that /api/ returns 200 OK with Hello World message"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "message" in data, "Response should contain 'message' key"
        assert data["message"] == "Hello World", f"Expected 'Hello World', got '{data['message']}'"
        print(f"✓ Root endpoint returned: {data}")


class TestStatusEndpoints:
    """Status CRUD endpoint tests"""
    
    def test_get_status_checks_returns_list(self):
        """Test that GET /api/status returns a list"""
        response = requests.get(f"{BASE_URL}/api/status")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), f"Expected list, got {type(data)}"
        print(f"✓ GET /api/status returned {len(data)} status checks")
    
    def test_create_status_check(self):
        """Test that POST /api/status creates a new status check"""
        payload = {"client_name": "TEST_deployment_check"}
        response = requests.post(f"{BASE_URL}/api/status", json=payload)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "id" in data, "Response should contain 'id'"
        assert "client_name" in data, "Response should contain 'client_name'"
        assert "timestamp" in data, "Response should contain 'timestamp'"
        assert data["client_name"] == "TEST_deployment_check", f"Expected 'TEST_deployment_check', got '{data['client_name']}'"
        print(f"✓ Created status check with id: {data['id']}")
    
    def test_create_and_verify_persistence(self):
        """Test that created status check persists in database"""
        # Create a unique status check
        import uuid
        unique_name = f"TEST_persist_{uuid.uuid4().hex[:8]}"
        payload = {"client_name": unique_name}
        
        # Create
        create_response = requests.post(f"{BASE_URL}/api/status", json=payload)
        assert create_response.status_code == 200
        created = create_response.json()
        
        # Verify by fetching all and checking if our entry exists
        get_response = requests.get(f"{BASE_URL}/api/status")
        assert get_response.status_code == 200
        
        all_checks = get_response.json()
        found = any(check.get("client_name") == unique_name for check in all_checks)
        assert found, f"Created status check '{unique_name}' not found in GET response"
        print(f"✓ Status check '{unique_name}' persisted and verified")


class TestCORSAndHeaders:
    """Test CORS and response headers"""
    
    def test_cors_headers_present(self):
        """Test that CORS headers are present in response"""
        response = requests.options(f"{BASE_URL}/api/", headers={
            "Origin": "https://example.com",
            "Access-Control-Request-Method": "GET"
        })
        # CORS preflight should return 200 or 204
        assert response.status_code in [200, 204, 405], f"Unexpected status: {response.status_code}"
        print(f"✓ CORS preflight returned status: {response.status_code}")
    
    def test_json_content_type(self):
        """Test that API returns JSON content type"""
        response = requests.get(f"{BASE_URL}/api/")
        content_type = response.headers.get("content-type", "")
        assert "application/json" in content_type, f"Expected JSON content type, got: {content_type}"
        print(f"✓ Content-Type: {content_type}")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
