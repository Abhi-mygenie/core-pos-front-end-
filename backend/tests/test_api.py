"""
Backend API Tests for MyGenie POS Deployment
Tests the minimal FastAPI stub backend endpoints
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestHealthEndpoints:
    """Health check and basic API endpoint tests"""
    
    def test_root_endpoint(self):
        """Test GET /api/ returns Hello World"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert data["message"] == "Hello World"
    
    def test_status_get_endpoint(self):
        """Test GET /api/status returns list"""
        response = requests.get(f"{BASE_URL}/api/status")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_status_post_endpoint(self):
        """Test POST /api/status creates status check"""
        payload = {"client_name": "TEST_deployment_check"}
        response = requests.post(
            f"{BASE_URL}/api/status",
            json=payload,
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        assert "client_name" in data
        assert data["client_name"] == "TEST_deployment_check"
        assert "timestamp" in data
    
    def test_status_persistence(self):
        """Test that status check is persisted in database"""
        # Create a status check
        payload = {"client_name": "TEST_persistence_check"}
        create_response = requests.post(
            f"{BASE_URL}/api/status",
            json=payload,
            headers={"Content-Type": "application/json"}
        )
        assert create_response.status_code == 200
        created_id = create_response.json()["id"]
        
        # Verify it appears in the list
        get_response = requests.get(f"{BASE_URL}/api/status")
        assert get_response.status_code == 200
        status_list = get_response.json()
        
        # Find the created status check
        found = any(s["id"] == created_id for s in status_list)
        assert found, f"Created status check with id {created_id} not found in list"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
