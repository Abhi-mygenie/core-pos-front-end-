"""
Backend API Tests for MyGenie POS Frontend Deployment
Tests the minimal FastAPI backend that serves as a placeholder
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestBackendAPI:
    """Test the minimal backend API endpoints"""
    
    def test_root_endpoint(self):
        """Test GET /api/ returns Hello World"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert data["message"] == "Hello World"
        print(f"PASS: Root endpoint returns: {data}")
    
    def test_status_get_endpoint(self):
        """Test GET /api/status returns list"""
        response = requests.get(f"{BASE_URL}/api/status")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"PASS: Status endpoint returns list with {len(data)} items")
    
    def test_status_post_endpoint(self):
        """Test POST /api/status creates a status check"""
        payload = {"client_name": "TEST_pytest_client"}
        response = requests.post(f"{BASE_URL}/api/status", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        assert data["client_name"] == "TEST_pytest_client"
        assert "timestamp" in data
        print(f"PASS: Status POST creates entry with id: {data['id']}")
    
    def test_status_persistence(self):
        """Test that created status is persisted and retrievable"""
        # Create a unique status
        unique_name = "TEST_persistence_check"
        payload = {"client_name": unique_name}
        create_response = requests.post(f"{BASE_URL}/api/status", json=payload)
        assert create_response.status_code == 200
        
        # Verify it appears in GET
        get_response = requests.get(f"{BASE_URL}/api/status")
        assert get_response.status_code == 200
        data = get_response.json()
        
        # Find our created entry
        found = any(item.get("client_name") == unique_name for item in data)
        assert found, f"Created status with client_name '{unique_name}' not found in GET response"
        print(f"PASS: Status persistence verified - found {unique_name} in GET response")


class TestCORSHeaders:
    """Test CORS configuration"""
    
    def test_cors_headers_present(self):
        """Test that CORS headers are present in response"""
        response = requests.options(
            f"{BASE_URL}/api/",
            headers={
                "Origin": "https://mygenie-pos-ui.preview.emergentagent.com",
                "Access-Control-Request-Method": "GET"
            }
        )
        # CORS preflight should return 200 or 204 (No Content)
        assert response.status_code in [200, 204]
        print(f"PASS: CORS preflight returns {response.status_code}")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
