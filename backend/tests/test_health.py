"""
Backend API Health Check Tests
Tests the basic health endpoint for the MyGenie Restaurant POS deployment
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestHealthCheck:
    """Health check endpoint tests"""
    
    def test_api_root_returns_200(self):
        """Test that /api/ endpoint returns 200 OK"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        # Verify response structure
        data = response.json()
        assert "message" in data, "Response should contain 'message' key"
        assert data["message"] == "Hello World", f"Expected 'Hello World', got {data['message']}"
        print(f"✓ /api/ returns 200 with message: {data['message']}")
    
    def test_api_status_get_returns_200(self):
        """Test that /api/status GET endpoint returns 200 OK"""
        response = requests.get(f"{BASE_URL}/api/status")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        # Verify response is a list
        data = response.json()
        assert isinstance(data, list), f"Expected list, got {type(data)}"
        print(f"✓ /api/status returns 200 with {len(data)} status checks")
    
    def test_api_status_post_creates_entry(self):
        """Test that /api/status POST creates a new status check"""
        payload = {"client_name": "TEST_deployment_check"}
        response = requests.post(f"{BASE_URL}/api/status", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        # Verify response structure
        data = response.json()
        assert "id" in data, "Response should contain 'id'"
        assert "client_name" in data, "Response should contain 'client_name'"
        assert data["client_name"] == "TEST_deployment_check"
        assert "timestamp" in data, "Response should contain 'timestamp'"
        print(f"✓ /api/status POST created entry with id: {data['id']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
