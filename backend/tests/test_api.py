"""
Backend API Tests for MyGenie POS Deployment
Tests basic health check and status endpoints
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestHealthCheck:
    """Health check endpoint tests"""
    
    def test_api_root_returns_200(self):
        """Test that /api/ returns 200 and Hello World message"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert data["message"] == "Hello World"
        print(f"SUCCESS: API root returns: {data}")

class TestStatusEndpoints:
    """Status endpoint tests"""
    
    def test_create_status_check(self):
        """Test POST /api/status creates a status check"""
        payload = {"client_name": "TEST_deployment_check"}
        response = requests.post(f"{BASE_URL}/api/status", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        assert data["client_name"] == "TEST_deployment_check"
        assert "timestamp" in data
        print(f"SUCCESS: Created status check: {data}")
        return data["id"]
    
    def test_get_status_checks(self):
        """Test GET /api/status returns list of status checks"""
        response = requests.get(f"{BASE_URL}/api/status")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"SUCCESS: Retrieved {len(data)} status checks")

if __name__ == "__main__":
    pytest.main([__file__, "-v"])
