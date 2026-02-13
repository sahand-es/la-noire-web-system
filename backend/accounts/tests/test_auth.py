from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase, APIClient
from rest_framework import status
from accounts.models import Role

User = get_user_model()


class UserRegistrationTestCase(APITestCase):
    """Test user registration functionality"""

    def setUp(self):
        self.client = APIClient()
        self.registration_url = '/core/auth/registrations/'

    def test_user_registration_success(self):
        """Test successful user registration"""
        data = {
            'username': 'john_doe',
            'email': 'john@example.com',
            'phone_number': '09123456789',
            'national_id': '1234567890',
            'first_name': 'John',
            'last_name': 'Doe',
            'password': 'SecurePass123!',
            'password_confirm': 'SecurePass123!'
        }
        response = self.client.post(self.registration_url, data, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('tokens', response.data)
        self.assertIn('access', response.data['tokens'])
        self.assertIn('refresh', response.data['tokens'])
        self.assertEqual(response.data['user']['username'], 'john_doe')

    def test_user_registration_password_mismatch(self):
        """Test registration with mismatched passwords"""
        data = {
            'username': 'jane_doe',
            'email': 'jane@example.com',
            'phone_number': '09123456790',
            'national_id': '1234567891',
            'first_name': 'Jane',
            'last_name': 'Doe',
            'password': 'SecurePass123!',
            'password_confirm': 'DifferentPass123!'
        }
        response = self.client.post(self.registration_url, data, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_user_registration_duplicate_username(self):
        """Test registration with duplicate username"""
        user_data = {
            'username': 'john_doe',
            'email': 'john@example.com',
            'phone_number': '09123456789',
            'national_id': '1234567890',
            'first_name': 'John',
            'last_name': 'Doe',
            'password': 'SecurePass123!'
        }
        User.objects.create_user(**user_data)

        data = {
            'username': 'john_doe',
            'email': 'another@example.com',
            'phone_number': '09987654321',
            'national_id': '9876543210',
            'first_name': 'Another',
            'last_name': 'User',
            'password': 'SecurePass123!',
            'password_confirm': 'SecurePass123!'
        }
        response = self.client.post(self.registration_url, data, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_user_registration_invalid_phone(self):
        """Test registration with invalid phone number"""
        data = {
            'username': 'john_doe',
            'email': 'john@example.com',
            'phone_number': '1234567890',
            'national_id': '1234567890',
            'first_name': 'John',
            'last_name': 'Doe',
            'password': 'SecurePass123!',
            'password_confirm': 'SecurePass123!'
        }
        response = self.client.post(self.registration_url, data, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_user_registration_invalid_national_id(self):
        """Test registration with invalid national ID"""
        data = {
            'username': 'john_doe',
            'email': 'john@example.com',
            'phone_number': '09123456789',
            'national_id': '12345',
            'first_name': 'John',
            'last_name': 'Doe',
            'password': 'SecurePass123!',
            'password_confirm': 'SecurePass123!'
        }
        response = self.client.post(self.registration_url, data, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class UserLoginTestCase(APITestCase):
    """Test user login functionality"""

    def setUp(self):
        self.client = APIClient()
        self.login_url = '/core/auth/sessions/'
        self.user_data = {
            'username': 'john_doe',
            'email': 'john@example.com',
            'phone_number': '09123456789',
            'national_id': '1234567890',
            'first_name': 'John',
            'last_name': 'Doe',
            'password': 'SecurePass123!'
        }
        self.user = User.objects.create_user(**self.user_data)

    def test_login_with_username(self):
        """Test login with username"""
        data = {
            'identifier': 'john_doe',
            'password': 'SecurePass123!'
        }
        response = self.client.post(self.login_url, data, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('tokens', response.data)
        self.assertIn('access', response.data['tokens'])
        self.assertEqual(response.data['user']['username'], 'john_doe')

    def test_login_with_email(self):
        """Test login with email"""
        data = {
            'identifier': 'john@example.com',
            'password': 'SecurePass123!'
        }
        response = self.client.post(self.login_url, data, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('tokens', response.data)

    def test_login_with_phone_number(self):
        """Test login with phone number"""
        data = {
            'identifier': '09123456789',
            'password': 'SecurePass123!'
        }
        response = self.client.post(self.login_url, data, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('tokens', response.data)

    def test_login_with_national_id(self):
        """Test login with national ID"""
        data = {
            'identifier': '1234567890',
            'password': 'SecurePass123!'
        }
        response = self.client.post(self.login_url, data, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('tokens', response.data)

    def test_login_invalid_credentials(self):
        """Test login with invalid credentials"""
        data = {
            'identifier': 'john_doe',
            'password': 'WrongPassword123!'
        }
        response = self.client.post(self.login_url, data, format='json')

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_login_inactive_user(self):
        """Test login with inactive user"""
        self.user.is_active = False
        self.user.save()

        data = {
            'identifier': 'john_doe',
            'password': 'SecurePass123!'
        }
        response = self.client.post(self.login_url, data, format='json')

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class RolePermissionTestCase(APITestCase):
    """Test role-based permissions"""

    def setUp(self):
        self.client = APIClient()
        self.roles_url = '/core/roles/'

        # Create roles
        self.admin_role = Role.objects.create(name='System Administrator', is_active=True)
        self.detective_role = Role.objects.create(name='Detective', is_active=True)
        self.cadet_role = Role.objects.create(name='Cadet', is_active=True)

        # Create users
        self.admin_user = User.objects.create_user(
            username='admin',
            email='admin@example.com',
            phone_number='09100000000',
            national_id='0000000000',
            first_name='Admin',
            last_name='User',
            password='AdminPass123!'
        )
        self.admin_user.roles.add(self.admin_role)

        self.detective_user = User.objects.create_user(
            username='detective',
            email='detective@example.com',
            phone_number='09100000001',
            national_id='0000000001',
            first_name='Det',
            last_name='User',
            password='DetPass123!'
        )
        self.detective_user.roles.add(self.detective_role)

    def test_admin_can_access_roles(self):
        """Test admin can access role management endpoints"""
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.get(self.roles_url, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_non_admin_cannot_access_roles(self):
        """Test non-admin cannot access role management endpoints"""
        self.client.force_authenticate(user=self.detective_user)
        response = self.client.get(self.roles_url, format='json')

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_unauthenticated_cannot_access_roles(self):
        """Test unauthenticated user cannot access role management"""
        response = self.client.get(self.roles_url, format='json')

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class UserManagementTestCase(APITestCase):
    """Test user management endpoints"""

    def setUp(self):
        self.client = APIClient()
        self.users_url = '/core/users/'

        # Create admin user
        self.admin_role = Role.objects.create(name='System Administrator', is_active=True)
        self.admin_user = User.objects.create_user(
            username='admin',
            email='admin@example.com',
            phone_number='09100000000',
            national_id='0000000000',
            first_name='Admin',
            last_name='User',
            password='AdminPass123!',
            is_superuser=True
        )
        self.admin_user.roles.add(self.admin_role)

    def test_admin_can_list_users(self):
        """Test admin can list users"""
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.get(self.users_url, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_admin_can_retrieve_user(self):
        """Test admin can retrieve a specific user"""
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.get(f'{self.users_url}{self.admin_user.id}/', format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['username'], 'admin')

    def test_authenticated_can_access_me_endpoint(self):
        """Test authenticated user can access their own profile via /me/"""
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.get(f'{self.users_url}me/', format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['username'], 'admin')

    def test_admin_can_deactivate_user(self):
        """Test admin can deactivate a user"""
        # Create a user to deactivate
        user = User.objects.create_user(
            username='test_user',
            email='test@example.com',
            phone_number='09100000001',
            national_id='0000000001',
            first_name='Test',
            last_name='User',
            password='TestPass123!'
        )

        self.client.force_authenticate(user=self.admin_user)
        response = self.client.post(
            f'{self.users_url}{user.id}/set_active/',
            {'is_active': False},
            format='json'
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        user.refresh_from_db()
        self.assertFalse(user.is_active)

    def test_admin_can_assign_roles(self):
        """Test admin can assign roles to a user"""
        role = Role.objects.create(name='Detective', is_active=True)
        user = User.objects.create_user(
            username='test_user',
            email='test@example.com',
            phone_number='09100000001',
            national_id='0000000001',
            first_name='Test',
            last_name='User',
            password='TestPass123!'
        )

        self.client.force_authenticate(user=self.admin_user)
        response = self.client.post(
            f'{self.users_url}{user.id}/assign_roles/',
            {'role_ids': [role.id]},
            format='json'
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        user.refresh_from_db()
        self.assertTrue(user.roles.filter(id=role.id).exists())


class RoleTestCase(TestCase):
    """Test Role model functionality"""

    def test_role_creation(self):
        """Test role creation"""
        role = Role.objects.create(
            name='Test Role',
            description='A test role',
            is_active=True
        )

        self.assertEqual(role.name, 'Test Role')
        self.assertTrue(role.is_active)
        self.assertEqual(str(role), 'Test Role')

    def test_role_uniqueness(self):
        """Test role name uniqueness"""
        Role.objects.create(name='Test Role', is_active=True)

        with self.assertRaises(Exception):
            Role.objects.create(name='Test Role', is_active=True)


class UserModelTestCase(TestCase):
    """Test UserProfile model functionality"""

    def setUp(self):
        self.user = User.objects.create_user(
            username='test_user',
            email='test@example.com',
            phone_number='09123456789',
            national_id='1234567890',
            first_name='Test',
            last_name='User',
            password='TestPass123!'
        )

    def test_user_creation(self):
        """Test user creation"""
        self.assertEqual(self.user.username, 'test_user')
        self.assertEqual(self.user.email, 'test@example.com')

    def test_user_has_role(self):
        """Test has_role method"""
        role = Role.objects.create(name='Detective', is_active=True)
        self.user.roles.add(role)

        self.assertTrue(self.user.has_role('Detective'))
        self.assertFalse(self.user.has_role('Cadet'))

    def test_user_has_any_role(self):
        """Test has_any_role method"""
        role1 = Role.objects.create(name='Detective', is_active=True)
        role2 = Role.objects.create(name='Sergeant', is_active=True)
        self.user.roles.add(role1)

        self.assertTrue(self.user.has_any_role(['Detective', 'Cadet']))
        self.assertFalse(self.user.has_any_role(['Cadet', 'Sergeant']))

    def test_user_get_full_name(self):
        """Test get_full_name method"""
        self.assertEqual(self.user.get_full_name(), 'Test User')

    def test_user_field_uniqueness(self):
        """Test field uniqueness constraints"""
        with self.assertRaises(Exception):
            User.objects.create_user(
                username='different_user',
                email='test@example.com',
                phone_number='09987654321',
                national_id='0987654321',
                first_name='Different',
                last_name='User',
                password='TestPass123!'
            )
