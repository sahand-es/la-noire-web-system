from rest_framework import status, generics, permissions, viewsets
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.decorators import action
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import login, logout
from drf_spectacular.utils import extend_schema, OpenApiExample

from core.models import UserProfile
from accounts.models import Role, ActionPermission
from accounts.serializers import (
    UserRegistrationSerializer,
    UserLoginSerializer,
    UserProfileSerializer,
    ChangePasswordSerializer,
    UserListSerializer,
    UserDetailSerializer,
    UserUpdateSerializer,
    RoleSerializer,
    RoleCreateUpdateSerializer,
    ActionPermissionSerializer,
    ActionPermissionCreateUpdateSerializer,
)
from accounts.permissions import IsSystemAdmin


class UserRegistrationView(generics.CreateAPIView):
    """
    User Registration Endpoint

    Register a new user with username, email, phone number, national ID, and password.
    New users receive the Base user role; the system administrator assigns other roles.
    """
    serializer_class = UserRegistrationSerializer
    permission_classes = [permissions.AllowAny]

    @extend_schema(
        request=UserRegistrationSerializer,
        responses={201: UserProfileSerializer},
        examples=[
            OpenApiExample(
                'Registration Example',
                value={
                    'username': 'john_doe',
                    'email': 'john@example.com',
                    'phone_number': '09123456789',
                    'national_id': '1234567890',
                    'first_name': 'John',
                    'last_name': 'Doe',
                    'password': 'SecurePass123!',
                    'password_confirm': 'SecurePass123!'
                }
            )
        ]
    )
    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        refresh = RefreshToken.for_user(user)

        return Response({
            'message': 'User registered successfully',
            'user': UserProfileSerializer(user).data,
            'tokens': {
                'refresh': str(refresh),
                'access': str(refresh.access_token),
            }
        }, status=status.HTTP_201_CREATED)


class UserLoginView(APIView):
    """
    User Login Endpoint

    Login with username, email, phone number, or national ID along with password.
    Returns user profile and JWT tokens.
    """
    permission_classes = [permissions.AllowAny]
    serializer_class = UserLoginSerializer

    @extend_schema(
        request=UserLoginSerializer,
        responses={200: UserProfileSerializer},
        examples=[
            OpenApiExample(
                'Login with Username',
                value={'identifier': 'john_doe', 'password': 'SecurePass123!'}
            ),
            OpenApiExample(
                'Login with Email',
                value={'identifier': 'john@example.com', 'password': 'SecurePass123!'}
            ),
            OpenApiExample(
                'Login with Phone',
                value={'identifier': '09123456789', 'password': 'SecurePass123!'}
            ),
            OpenApiExample(
                'Login with National ID',
                value={'identifier': '1234567890', 'password': 'SecurePass123!'}
            )
        ]
    )
    def post(self, request):
        serializer = UserLoginSerializer(data=request.data, context={'request': request})
        if not serializer.is_valid():
            for field, errors in serializer.errors.items():
                if isinstance(errors, list) and errors:
                    error_detail = errors[0]
                    if hasattr(error_detail, 'code') and error_detail.code == 'authorization':
                        return Response(
                            {'error': str(error_detail)},
                            status=status.HTTP_401_UNAUTHORIZED
                        )
            return Response(
                {'error': 'Invalid credentials'},
                status=status.HTTP_400_BAD_REQUEST
            )

        user = serializer.validated_data['user']
        refresh = RefreshToken.for_user(user)
        login(request, user)

        return Response({
            'message': 'Login successful',
            'user': UserProfileSerializer(user).data,
            'tokens': {
                'refresh': str(refresh),
                'access': str(refresh.access_token),
            }
        }, status=status.HTTP_200_OK)


class UserLogoutView(APIView):
    """
    User Logout Endpoint

    Logout the current user and blacklist the refresh token.
    """
    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(
        request={
            'application/json': {
                'type': 'object',
                'properties': {'refresh': {'type': 'string'}}
            }
        },
        responses={205: None}
    )
    def post(self, request):
        try:
            refresh_token = request.data.get('refresh')
            if refresh_token:
                token = RefreshToken(refresh_token)
                token.blacklist()
            logout(request)
            return Response(
                {'message': 'Logout successful'},
                status=status.HTTP_205_RESET_CONTENT
            )
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )


class UserProfileView(generics.RetrieveUpdateAPIView):
    """
    Get and Update User Profile

    GET: Retrieve current user's profile
    PATCH/PUT: Update current user's profile
    """
    serializer_class = UserProfileSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user

    @extend_schema(responses={200: UserProfileSerializer})
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)

    @extend_schema(request=UserProfileSerializer, responses={200: UserProfileSerializer})
    def patch(self, request, *args, **kwargs):
        return super().patch(request, *args, **kwargs)


class ChangePasswordView(APIView):
    """
    Change User Password

    Allows authenticated users to change their password.
    """
    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(
        request=ChangePasswordSerializer,
        responses={200: {'type': 'object', 'properties': {'message': {'type': 'string'}}}},
        examples=[
            OpenApiExample(
                'Change Password Example',
                value={
                    'old_password': 'OldPass123!',
                    'new_password': 'NewSecurePass123!',
                    'new_password_confirm': 'NewSecurePass123!'
                }
            )
        ]
    )
    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        user = request.user
        user.set_password(serializer.validated_data['new_password'])
        user.save()
        return Response(
            {'message': 'Password changed successfully'},
            status=status.HTTP_200_OK
        )


class RoleViewSet(viewsets.ModelViewSet):
    """
    Role Management ViewSet

    CRUD operations on roles (requires System Administrator role).
    """
    queryset = Role.objects.all().order_by('name')
    permission_classes = [permissions.IsAuthenticated, IsSystemAdmin]

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return RoleCreateUpdateSerializer
        return RoleSerializer

    @extend_schema(responses={200: RoleSerializer(many=True)}, description='List all active and inactive roles')
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)

    @extend_schema(request=RoleCreateUpdateSerializer, responses={201: RoleSerializer}, description='Create a new role')
    def create(self, request, *args, **kwargs):
        return super().create(request, *args, **kwargs)

    @extend_schema(responses={200: RoleSerializer}, description='Retrieve a specific role')
    def retrieve(self, request, *args, **kwargs):
        return super().retrieve(request, *args, **kwargs)

    @extend_schema(request=RoleCreateUpdateSerializer, responses={200: RoleSerializer}, description='Update an entire role')
    def update(self, request, *args, **kwargs):
        return super().update(request, *args, **kwargs)

    @extend_schema(request=RoleCreateUpdateSerializer, responses={200: RoleSerializer}, description='Partially update a role')
    def partial_update(self, request, *args, **kwargs):
        return super().partial_update(request, *args, **kwargs)

    @extend_schema(responses={204: None}, description='Delete a role')
    def destroy(self, request, *args, **kwargs):
        return super().destroy(request, *args, **kwargs)


class ActionPermissionViewSet(viewsets.ModelViewSet):
    """
    Action Permission CRUD ViewSet

    List, create, update, delete action permissions and assign roles (requires System Administrator).
    """
    queryset = ActionPermission.objects.all().prefetch_related('roles').order_by('codename')
    permission_classes = [permissions.IsAuthenticated, IsSystemAdmin]

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return ActionPermissionCreateUpdateSerializer
        return ActionPermissionSerializer


class UserViewSet(viewsets.ModelViewSet):
    """
    User Management ViewSet

    CRUD operations on users (requires System Administrator role).
    """
    queryset = UserProfile.objects.all().select_related().prefetch_related('roles').order_by('-created_at')
    permission_classes = [permissions.IsAuthenticated, IsSystemAdmin]

    def get_serializer_class(self):
        if self.action == 'create':
            return UserRegistrationSerializer
        if self.action in ['update', 'partial_update']:
            return UserUpdateSerializer
        if self.action == 'retrieve':
            return UserDetailSerializer
        if self.action == 'list':
            return UserListSerializer
        return UserProfileSerializer

    @extend_schema(responses={200: UserListSerializer(many=True)}, description='List all users')
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)

    @extend_schema(request=UserRegistrationSerializer, responses={201: UserProfileSerializer}, description='Create a new user')
    def create(self, request, *args, **kwargs):
        return super().create(request, *args, **kwargs)

    @extend_schema(responses={200: UserDetailSerializer}, description='Retrieve a specific user')
    def retrieve(self, request, *args, **kwargs):
        return super().retrieve(request, *args, **kwargs)

    @extend_schema(request=UserUpdateSerializer, responses={200: UserDetailSerializer}, description='Update an entire user')
    def update(self, request, *args, **kwargs):
        return super().update(request, *args, **kwargs)

    @extend_schema(request=UserUpdateSerializer, responses={200: UserDetailSerializer}, description='Partially update a user')
    def partial_update(self, request, *args, **kwargs):
        return super().partial_update(request, *args, **kwargs)

    @extend_schema(responses={204: None}, description='Delete a user')
    def destroy(self, request, *args, **kwargs):
        return super().destroy(request, *args, **kwargs)

    @action(detail=False, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def me(self, request):
        """Get current user profile"""
        serializer = UserDetailSerializer(request.user)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated, IsSystemAdmin])
    def set_active(self, request, pk=None):
        """Activate/deactivate a user"""
        user = self.get_object()
        is_active = request.data.get('is_active', True)
        user.is_active = is_active
        user.save()
        return Response({
            'message': f'User {"activated" if is_active else "deactivated"} successfully',
            'user': UserDetailSerializer(user).data
        }, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated, IsSystemAdmin])
    def assign_roles(self, request, pk=None):
        """Assign roles to a user"""
        user = self.get_object()
        roles_ids = request.data.get('role_ids', [])

        if not roles_ids:
            return Response(
                {'error': 'role_ids list is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        roles = Role.objects.filter(id__in=roles_ids, is_active=True)
        if not roles.exists():
            return Response(
                {'error': 'No valid active roles found'},
                status=status.HTTP_404_NOT_FOUND
            )

        user.roles.set(roles)
        return Response({
            'message': 'Roles assigned successfully',
            'user': UserDetailSerializer(user).data
        }, status=status.HTTP_200_OK)
