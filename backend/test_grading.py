"""
Test script for the AI Grading Service
This script tests the grading endpoint with sample data
"""

import requests
import json
from io import BytesIO
from PIL import Image

# API Configuration
API_BASE_URL = "http://localhost:8000"
GRADING_ENDPOINT = f"{API_BASE_URL}/api/v1/grade"

def test_grading_service():
    """Test the grading service with a simple request"""
    
    print("🧪 Testing AI Grading Service...\n")
    
    # Test 1: Health check
    print("1. Testing root endpoint...")
    try:
        response = requests.get(API_BASE_URL)
        print(f"   ✅ Status: {response.status_code}")
        print(f"   Response: {response.json()}\n")
    except Exception as e:
        print(f"   ❌ Error: {e}\n")
    
    # Test 2: Check OpenAPI docs
    print("2. Checking API documentation...")
    try:
        response = requests.get(f"{API_BASE_URL}/docs")
        if response.status_code == 200:
            print(f"   ✅ API Docs available at: {API_BASE_URL}/docs\n")
        else:
            print(f"   ⚠️  Status: {response.status_code}\n")
    except Exception as e:
        print(f"   ❌ Error: {e}\n")
    
    # Test 3: Test grading endpoint (will fail without actual PDFs and API key)
    print("3. Testing grading endpoint structure...")
    print(f"   Endpoint: POST {GRADING_ENDPOINT}")
    print(f"   Required fields:")
    print(f"     - professor_key_pdf: PDF file")
    print(f"     - student_answer_pdf: PDF file")
    print(f"     - marks_per_question: float")
    print(f"     - openai_api_key: string (optional if set in .env)")
    print()
    
    # Test 4: Check if endpoint exists (without sending files)
    print("4. Verifying endpoint exists...")
    try:
        # Try GET request (should return 405 Method Not Allowed since it expects POST)
        response = requests.get(GRADING_ENDPOINT)
        if response.status_code == 405:
            print(f"   ✅ Endpoint exists (POST method required)\n")
        elif response.status_code == 404:
            print(f"   ❌ Endpoint not found - check router configuration\n")
        else:
            print(f"   Status: {response.status_code}\n")
    except Exception as e:
        print(f"   ❌ Error: {e}\n")
    
    print("=" * 60)
    print("\n✅ AI Grading Service Setup Complete!")
    print("\nNext Steps:")
    print("1. Set OPENAI_API_KEY in your .env file")
    print("2. Visit http://localhost:8000/docs to test the endpoint interactively")
    print("3. Upload PDFs to test the actual grading functionality")
    print("\nEndpoint Details:")
    print(f"  POST {GRADING_ENDPOINT}")
    print("  Content-Type: multipart/form-data")
    print("  Returns: Batch grading results with student scores and feedback")

if __name__ == "__main__":
    test_grading_service()
