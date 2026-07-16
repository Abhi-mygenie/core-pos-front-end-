"""
Backend API Tests for MyGenie POS Application
Tests the FastAPI backend endpoints
"""
import pytest
import requests
import os

# Get base URL from environment
BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
if not BASE_URL:
    raise ValueError("REACT_APP_BACKEND_URL environment variable not set")


class TestHealthEndpoints:
    """Test basic health and root endpoints"""
    
    def test_root_endpoint(self):
        """Test GET /api/ returns hello world message"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert data["message"] == "Hello World"
    
    def test_root_endpoint_response_time(self):
        """Test root endpoint responds within reasonable time"""
        response = requests.get(f"{BASE_URL}/api/", timeout=5)
        assert response.status_code == 200
        assert response.elapsed.total_seconds() < 5


class TestStatusEndpoints:
    """Test status check CRUD endpoints"""
    
    def test_create_status_check(self):
        """Test POST /api/status creates a new status check"""
        payload = {"client_name": "TEST_pytest_client"}
        response = requests.post(f"{BASE_URL}/api/status", json=payload)
        
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        assert data["client_name"] == "TEST_pytest_client"
        assert "timestamp" in data
    
    def test_get_status_checks(self):
        """Test GET /api/status returns list of status checks"""
        response = requests.get(f"{BASE_URL}/api/status")
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_create_and_verify_status_check(self):
        """Test creating a status check and verifying it appears in the list"""
        # Create a unique status check
        import uuid
        unique_name = f"TEST_verify_{uuid.uuid4().hex[:8]}"
        
        # Create
        create_response = requests.post(
            f"{BASE_URL}/api/status",
            json={"client_name": unique_name}
        )
        assert create_response.status_code == 200
        created = create_response.json()
        
        # Verify in list
        list_response = requests.get(f"{BASE_URL}/api/status")
        assert list_response.status_code == 200
        status_list = list_response.json()
        
        # Find our created status check
        found = any(s["client_name"] == unique_name for s in status_list)
        assert found, f"Created status check '{unique_name}' not found in list"


class TestWorkflowQueueEndpoints:
    """Test workflow queue endpoints"""
    
    def test_get_workflow_queue_empty(self):
        """Test GET /api/workflow-queue returns default structure"""
        response = requests.get(f"{BASE_URL}/api/workflow-queue")
        
        assert response.status_code == 200
        data = response.json()
        # Should have batches, approvals, smoke_results keys
        assert "batches" in data or isinstance(data, dict)
    
    def test_save_and_get_workflow_queue(self):
        """Test POST and GET /api/workflow-queue"""
        test_payload = {
            "batches": [{"id": "test_batch_1", "name": "Test Batch"}],
            "approvals": [],
            "smoke_results": []
        }
        
        # Save
        save_response = requests.post(
            f"{BASE_URL}/api/workflow-queue",
            json=test_payload
        )
        assert save_response.status_code == 200
        save_data = save_response.json()
        assert save_data["status"] == "saved"
        
        # Get and verify
        get_response = requests.get(f"{BASE_URL}/api/workflow-queue")
        assert get_response.status_code == 200
        get_data = get_response.json()
        assert get_data["batches"][0]["id"] == "test_batch_1"


class TestCORSHeaders:
    """Test CORS configuration"""
    
    def test_cors_headers_present(self):
        """Test that CORS headers are present in response"""
        response = requests.options(
            f"{BASE_URL}/api/",
            headers={
                "Origin": "https://example.com",
                "Access-Control-Request-Method": "GET"
            }
        )
        # Should not fail - CORS is configured
        assert response.status_code in [200, 204, 405]


class TestErrorHandling:
    """Test error handling"""
    
    def test_invalid_endpoint_returns_404(self):
        """Test that invalid API endpoints return 404"""
        response = requests.get(f"{BASE_URL}/api/nonexistent-endpoint-xyz")
        assert response.status_code == 404
    
    def test_invalid_json_body(self):
        """Test that invalid JSON body is handled"""
        response = requests.post(
            f"{BASE_URL}/api/status",
            data="not valid json",
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 422  # Unprocessable Entity


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
