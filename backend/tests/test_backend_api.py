"""
Backend API Tests for POS React App
Tests the FastAPI backend health check and status endpoints
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestHealthCheck:
    """Health check endpoint tests"""
    
    def test_root_endpoint_returns_200(self):
        """Test that /api/ returns 200 and Hello World message"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "message" in data, "Response should contain 'message' key"
        assert data["message"] == "Hello World", f"Expected 'Hello World', got '{data['message']}'"
        print(f"✓ Root endpoint returned: {data}")


class TestStatusEndpoints:
    """Status CRUD endpoint tests"""
    
    def test_create_status_check(self):
        """Test POST /api/status creates a new status check"""
        payload = {"client_name": "TEST_playwright_client"}
        response = requests.post(f"{BASE_URL}/api/status", json=payload)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "id" in data, "Response should contain 'id'"
        assert "client_name" in data, "Response should contain 'client_name'"
        assert "timestamp" in data, "Response should contain 'timestamp'"
        assert data["client_name"] == "TEST_playwright_client"
        print(f"✓ Created status check: {data['id']}")
        return data["id"]
    
    def test_get_status_checks(self):
        """Test GET /api/status returns list of status checks"""
        response = requests.get(f"{BASE_URL}/api/status")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✓ Retrieved {len(data)} status checks")
    
    def test_create_and_verify_persistence(self):
        """Test that created status check persists in database"""
        # Create a unique status check
        import uuid
        unique_name = f"TEST_persistence_{uuid.uuid4().hex[:8]}"
        
        # Create
        create_response = requests.post(f"{BASE_URL}/api/status", json={"client_name": unique_name})
        assert create_response.status_code == 200
        created_id = create_response.json()["id"]
        
        # Verify by fetching all and checking if our entry exists
        get_response = requests.get(f"{BASE_URL}/api/status")
        assert get_response.status_code == 200
        
        all_checks = get_response.json()
        found = any(check.get("id") == created_id for check in all_checks)
        assert found, f"Created status check {created_id} not found in GET response"
        print(f"✓ Verified persistence of status check: {created_id}")


class TestFrontendAccessibility:
    """Test that frontend is accessible"""
    
    def test_frontend_returns_200(self):
        """Test that frontend root returns 200"""
        response = requests.get(f"{BASE_URL}/")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("✓ Frontend is accessible")
    
    def test_frontend_returns_html(self):
        """Test that frontend returns HTML content"""
        response = requests.get(f"{BASE_URL}/")
        assert response.status_code == 200
        
        content_type = response.headers.get("content-type", "")
        assert "text/html" in content_type, f"Expected HTML content type, got {content_type}"
        
        # Check for React root element
        assert "root" in response.text or "React" in response.text, "Response should contain React app markers"
        print("✓ Frontend returns valid HTML")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
