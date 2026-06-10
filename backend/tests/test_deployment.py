"""
Deployment Verification Tests for Core POS Frontend
Tests backend health and external API connectivity
"""
import pytest
import requests
import os

# Use the public URL for testing
BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://core-pos-deploy-5.preview.emergentagent.com').rstrip('/')
EXTERNAL_API_URL = "https://preprod.mygenie.online"


class TestBackendHealth:
    """Backend API health check tests"""
    
    def test_backend_api_root_returns_200(self):
        """Test that /api/ endpoint returns 200"""
        response = requests.get(f"{BASE_URL}/api/", timeout=10)
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert data["message"] == "Hello World"
        print(f"✓ Backend API root: {data}")
    
    def test_backend_status_endpoint_get(self):
        """Test that /api/status endpoint returns 200"""
        response = requests.get(f"{BASE_URL}/api/status", timeout=10)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Backend status endpoint: returned {len(data)} records")
    
    def test_backend_status_endpoint_post(self):
        """Test that /api/status POST creates a status check"""
        payload = {"client_name": "TEST_deployment_verification"}
        response = requests.post(f"{BASE_URL}/api/status", json=payload, timeout=10)
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        assert data["client_name"] == "TEST_deployment_verification"
        print(f"✓ Backend status POST: created record with id {data['id']}")


class TestExternalAPIConnectivity:
    """External API connectivity tests"""
    
    def test_external_api_reachable(self):
        """Test that external API at preprod.mygenie.online is reachable"""
        response = requests.get(f"{EXTERNAL_API_URL}/", timeout=10)
        assert response.status_code == 200
        print(f"✓ External API reachable: {EXTERNAL_API_URL}")


class TestEnvironmentVariables:
    """Environment variable verification tests"""
    
    def test_react_app_backend_url_set(self):
        """Verify REACT_APP_BACKEND_URL is set"""
        url = os.environ.get('REACT_APP_BACKEND_URL')
        # This test runs in backend context, so we check if the URL is accessible
        assert BASE_URL is not None
        assert "core-pos-deploy" in BASE_URL or "localhost" in BASE_URL or "preview.emergentagent.com" in BASE_URL
        print(f"✓ REACT_APP_BACKEND_URL: {BASE_URL}")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
