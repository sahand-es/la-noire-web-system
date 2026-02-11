from django.http import HttpResponse
from rest_framework import status, generics, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.authtoken.models import Token
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import login, logout
from drf_spectacular.utils import extend_schema, OpenApiParameter, OpenApiExample
from .serializers import (
    UserRegistrationSerializer,
    UserLoginSerializer,
    UserProfileSerializer,
    ChangePasswordSerializer
)
from .models import UserProfile

def index(request):
    return HttpResponse("Hello, world.")





class UserRegistrationView(generics.CreateAPIView):
    """
    User Registration Endpoint

    Register a new user with username, email, phone number, national ID, and password.
    Optionally assign roles during registration.
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

        # Generate tokens
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
                value={
                    'identifier': 'john_doe',
                    'password': 'SecurePass123!'
                }
            ),
            OpenApiExample(
                'Login with Email',
                value={
                    'identifier': 'john@example.com',
                    'password': 'SecurePass123!'
                }
            ),
            OpenApiExample(
                'Login with Phone',
                value={
                    'identifier': '09123456789',
                    'password': 'SecurePass123!'
                }
            ),
            OpenApiExample(
                'Login with National ID',
                value={
                    'identifier': '1234567890',
                    'password': 'SecurePass123!'
                }
            )
        ]
    )
    def post(self, request):
        serializer = UserLoginSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)

        user = serializer.validated_data['user']

        # Generate tokens
        refresh = RefreshToken.for_user(user)

        # Django session login (optional, useful for browsable API)
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
                'properties': {
                    'refresh': {'type': 'string'}
                }
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

            return Response({
                'message': 'Logout successful'
            }, status=status.HTTP_205_RESET_CONTENT)
        except Exception as e:
            return Response({
                'error': str(e)
            }, status=status.HTTP_400_BAD_REQUEST)


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

    @extend_schema(
        responses={200: UserProfileSerializer}
    )
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)

    @extend_schema(
        request=UserProfileSerializer,
        responses={200: UserProfileSerializer}
    )
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

        return Response({
            'message': 'Password changed successfully'
        }, status=status.HTTP_200_OK)
