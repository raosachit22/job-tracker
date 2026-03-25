import requests
import sys
import json
from datetime import datetime

class JobTrackerAPITester:
    def __init__(self, base_url="https://app-tracker-252.preview.emergentagent.com"):
        self.base_url = base_url
        self.session = requests.Session()
        self.tests_run = 0
        self.tests_passed = 0
        self.user_id = None

    def run_test(self, name, method, endpoint, expected_status, data=None, cookies=None):
        """Run a single API test"""
        url = f"{self.base_url}/api/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = self.session.get(url, headers=headers)
            elif method == 'POST':
                response = self.session.post(url, json=data, headers=headers)
            elif method == 'PUT':
                response = self.session.put(url, json=data, headers=headers)
            elif method == 'DELETE':
                response = self.session.delete(url, headers=headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    return True, response.json()
                except:
                    return True, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_data = response.json()
                    print(f"   Error: {error_data}")
                except:
                    print(f"   Response: {response.text}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_root_endpoint(self):
        """Test root API endpoint"""
        success, response = self.run_test(
            "Root API Endpoint",
            "GET",
            "",
            200
        )
        return success

    def test_register_user(self):
        """Test user registration"""
        test_user_data = {
            "email": f"test_user_{datetime.now().strftime('%H%M%S')}@test.com",
            "password": "TestPass123!",
            "name": "Test User"
        }
        
        success, response = self.run_test(
            "User Registration",
            "POST",
            "auth/register",
            200,
            data=test_user_data
        )
        
        if success and 'id' in response:
            self.user_id = response['id']
            print(f"   Registered user ID: {self.user_id}")
            return True
        return False

    def test_admin_login(self):
        """Test admin login"""
        admin_data = {
            "email": "admin@jobtracker.com",
            "password": "Admin123!"
        }
        
        success, response = self.run_test(
            "Admin Login",
            "POST",
            "auth/login",
            200,
            data=admin_data
        )
        
        if success and 'id' in response:
            print(f"   Admin logged in: {response['email']}")
            return True
        return False

    def test_get_current_user(self):
        """Test getting current user info"""
        success, response = self.run_test(
            "Get Current User",
            "GET",
            "auth/me",
            200
        )
        return success

    def test_create_job(self):
        """Test creating a job application"""
        job_data = {
            "company": "Test Company",
            "title": "Software Engineer",
            "role": "Backend Engineer",
            "status": "Applied",
            "priority": "High",
            "date": "2024-01-15",
            "link": "https://example.com/job",
            "notes": "Great opportunity",
            "contacts": [
                {
                    "name": "John Recruiter",
                    "role": "Recruiter",
                    "email": "john@testcompany.com",
                    "linkedin": "linkedin.com/in/john",
                    "phone": "+1234567890"
                }
            ],
            "custom_fields": {}
        }
        
        success, response = self.run_test(
            "Create Job Application",
            "POST",
            "jobs",
            201,
            data=job_data
        )
        
        if success and 'id' in response:
            self.job_id = response['id']
            print(f"   Created job ID: {self.job_id}")
            return True
        return False

    def test_get_jobs(self):
        """Test getting all jobs"""
        success, response = self.run_test(
            "Get All Jobs",
            "GET",
            "jobs",
            200
        )
        
        if success:
            print(f"   Found {len(response)} jobs")
        return success

    def test_get_single_job(self):
        """Test getting a single job"""
        if not hasattr(self, 'job_id'):
            print("   Skipping - no job ID available")
            return True
            
        success, response = self.run_test(
            "Get Single Job",
            "GET",
            f"jobs/{self.job_id}",
            200
        )
        return success

    def test_update_job(self):
        """Test updating a job"""
        if not hasattr(self, 'job_id'):
            print("   Skipping - no job ID available")
            return True
            
        update_data = {
            "status": "Interviewing",
            "notes": "Updated notes - phone screening completed"
        }
        
        success, response = self.run_test(
            "Update Job",
            "PUT",
            f"jobs/{self.job_id}",
            200,
            data=update_data
        )
        return success

    def test_create_custom_column(self):
        """Test creating a custom column"""
        column_data = {
            "name": "Salary Range",
            "field_type": "text",
            "options": []
        }
        
        success, response = self.run_test(
            "Create Custom Column (Text)",
            "POST",
            "columns",
            201,
            data=column_data
        )
        
        if success and 'id' in response:
            self.text_column_id = response['id']
            print(f"   Created text column ID: {self.text_column_id}")
        
        # Test dropdown column
        dropdown_data = {
            "name": "Interview Stage",
            "field_type": "dropdown",
            "options": ["Phone Screen", "Technical", "Final", "Offer"]
        }
        
        success2, response2 = self.run_test(
            "Create Custom Column (Dropdown)",
            "POST",
            "columns",
            201,
            data=dropdown_data
        )
        
        if success2 and 'id' in response2:
            self.dropdown_column_id = response2['id']
            print(f"   Created dropdown column ID: {self.dropdown_column_id}")
        
        return success and success2

    def test_get_columns(self):
        """Test getting all custom columns"""
        success, response = self.run_test(
            "Get Custom Columns",
            "GET",
            "columns",
            200
        )
        
        if success:
            print(f"   Found {len(response)} custom columns")
        return success

    def test_get_stats(self):
        """Test getting analytics stats"""
        success, response = self.run_test(
            "Get Analytics Stats",
            "GET",
            "stats",
            200
        )
        
        if success:
            print(f"   Total jobs: {response.get('total', 0)}")
            print(f"   Status breakdown: {response.get('by_status', {})}")
            print(f"   Priority breakdown: {response.get('by_priority', {})}")
        return success

    def test_export_jobs(self):
        """Test exporting jobs"""
        success, response = self.run_test(
            "Export Jobs",
            "GET",
            "jobs/export/all",
            200
        )
        
        if success:
            jobs_count = len(response.get('jobs', []))
            print(f"   Exported {jobs_count} jobs")
        return success

    def test_import_jobs(self):
        """Test importing jobs"""
        import_data = {
            "jobs": [
                {
                    "company": "Imported Company",
                    "title": "Imported Role",
                    "status": "Pending",
                    "priority": "Medium",
                    "date": "2024-01-20",
                    "notes": "Imported via API test",
                    "contacts": [],
                    "custom_fields": {}
                }
            ]
        }
        
        success, response = self.run_test(
            "Import Jobs",
            "POST",
            "jobs/import",
            200,
            data=import_data
        )
        
        if success:
            print(f"   Imported {response.get('imported', 0)} jobs")
        return success

    def test_delete_job(self):
        """Test deleting a job"""
        if not hasattr(self, 'job_id'):
            print("   Skipping - no job ID available")
            return True
            
        success, response = self.run_test(
            "Delete Job",
            "DELETE",
            f"jobs/{self.job_id}",
            200
        )
        return success

    def test_delete_columns(self):
        """Test deleting custom columns"""
        success1 = True
        success2 = True
        
        if hasattr(self, 'text_column_id'):
            success1, _ = self.run_test(
                "Delete Text Column",
                "DELETE",
                f"columns/{self.text_column_id}",
                200
            )
        
        if hasattr(self, 'dropdown_column_id'):
            success2, _ = self.run_test(
                "Delete Dropdown Column",
                "DELETE",
                f"columns/{self.dropdown_column_id}",
                200
            )
        
        return success1 and success2

    def test_logout(self):
        """Test logout"""
        success, response = self.run_test(
            "Logout",
            "POST",
            "auth/logout",
            200
        )
        return success

    def test_brute_force_protection(self):
        """Test brute force protection"""
        print(f"\n🔍 Testing Brute Force Protection...")
        
        # Try multiple failed logins
        failed_attempts = 0
        for i in range(6):  # Try 6 times to trigger lockout
            response = self.session.post(
                f"{self.base_url}/api/auth/login",
                json={"email": "admin@jobtracker.com", "password": "wrongpassword"},
                headers={'Content-Type': 'application/json'}
            )
            
            if response.status_code == 429:
                print(f"✅ Brute force protection triggered after {i+1} attempts")
                self.tests_passed += 1
                self.tests_run += 1
                return True
            elif response.status_code == 401:
                failed_attempts += 1
                print(f"   Attempt {i+1}: 401 Unauthorized")
            else:
                print(f"   Attempt {i+1}: Unexpected status {response.status_code}")
        
        print(f"❌ Brute force protection not triggered after {failed_attempts} attempts")
        self.tests_run += 1
        return False

def main():
    print("🚀 Starting Job Tracker API Tests")
    print("=" * 50)
    
    tester = JobTrackerAPITester()
    
    # Test sequence
    tests = [
        tester.test_root_endpoint,
        tester.test_register_user,
        tester.test_admin_login,
        tester.test_get_current_user,
        tester.test_create_job,
        tester.test_get_jobs,
        tester.test_get_single_job,
        tester.test_update_job,
        tester.test_create_custom_column,
        tester.test_get_columns,
        tester.test_get_stats,
        tester.test_export_jobs,
        tester.test_import_jobs,
        tester.test_delete_job,
        tester.test_delete_columns,
        tester.test_logout,
        tester.test_brute_force_protection,
    ]
    
    # Run all tests
    for test in tests:
        try:
            test()
        except Exception as e:
            print(f"❌ Test failed with exception: {str(e)}")
            tester.tests_run += 1
    
    # Print results
    print("\n" + "=" * 50)
    print(f"📊 Test Results: {tester.tests_passed}/{tester.tests_run} passed")
    
    if tester.tests_passed == tester.tests_run:
        print("🎉 All tests passed!")
        return 0
    else:
        print(f"⚠️  {tester.tests_run - tester.tests_passed} tests failed")
        return 1

if __name__ == "__main__":
    sys.exit(main())