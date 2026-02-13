from django.contrib.auth import authenticate, get_user_model
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

from core.models import Role, UserProfile

User = get_user_model()


class RoleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Role
        fields = ['id', 'name', 'description', 'is_active']
        read_only_fields = ['id']


class UserRegistrationSerializer(serializers.ModelSerializer):
    """Public registration. Roles are not accepted; admin assigns roles after registration."""
    password = serializers.CharField(write_only=True, required=True, validators=[validate_password])
    password_confirm = serializers.CharField(write_only=True, required=True)

    class Meta:
        model = UserProfile
        fields = [
            'id',
            'username',
            'email',
            'phone_number',
            'national_id',
            'first_name',
            'last_name',
            'password',
            'password_confirm',
        ]
        read_only_fields = ['id']
        extra_kwargs = {
            'email': {'required': True},
            'phone_number': {'required': True},
            'national_id': {'required': True},
            'first_name': {'required': True},
            'last_name': {'required': True},
        }

    def validate(self, attrs):
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError({"password": "Password fields didn't match."})
        return attrs

    def validate_phone_number(self, value):
        # Iranian phone number validation (example)
        if not value.startswith('09') or len(value) != 11:
            raise serializers.ValidationError("Phone number must start with 09 and be 11 digits.")
        return value

    def validate_national_id(self, value):
        # Iranian national ID validation (10 digits)
        if not value.isdigit() or len(value) != 10:
            raise serializers.ValidationError("National ID must be exactly 10 digits.")
        return value

    def create(self, validated_data):
        validated_data.pop('password_confirm')
        password = validated_data.pop('password')

        user = UserProfile.objects.create(**validated_data)
        user.set_password(password)
        user.save()

        default_role, _ = Role.objects.get_or_create(
            name='Base user',
            defaults={'description': 'Default role for registered users'}
        )
        user.roles.add(default_role)

        return user


class UserLoginSerializer(serializers.Serializer):
    identifier = serializers.CharField(required=True, help_text="Username, Email, Phone Number, or National ID")
    password = serializers.CharField(required=True, write_only=True, style={'input_type': 'password'})

    def validate(self, attrs):
        identifier = attrs.get('identifier')
        password = attrs.get('password')

        if identifier and password:
            user = authenticate(
                request=self.context.get('request'),
                username=identifier,
                password=password
            )

            if not user:
                raise serializers.ValidationError(
                    "Unable to log in with provided credentials.",
                    code='authorization'
                )

            if not user.is_active:
                raise serializers.ValidationError(
                    "User account is disabled.",
                    code='authorization'
                )
        else:
            raise serializers.ValidationError(
                "Must include 'identifier' and 'password'.",
                code='authorization'
            )

        attrs['user'] = user
        return attrs


class UserProfileSerializer(serializers.ModelSerializer):
    roles = RoleSerializer(many=True, read_only=True)
    full_name = serializers.SerializerMethodField()

    class Meta:
        model = UserProfile
        fields = [
            'id',
            'username',
            'email',
            'phone_number',
            'national_id',
            'first_name',
            'last_name',
            'full_name',
            'roles',
            'is_verified',
            'is_active',
            'created_at',
            'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_full_name(self, obj):
        return obj.get_full_name()


class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(required=True, write_only=True)
    new_password = serializers.CharField(required=True, write_only=True, validators=[validate_password])
    new_password_confirm = serializers.CharField(required=True, write_only=True)

    def validate(self, attrs):
        if attrs['new_password'] != attrs['new_password_confirm']:
            raise serializers.ValidationError({"new_password": "Password fields didn't match."})
        return attrs

    def validate_old_password(self, value):
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError("Old password is incorrect.")
        return value


class UserListSerializer(serializers.ModelSerializer):
    roles = RoleSerializer(many=True, read_only=True)
    full_name = serializers.SerializerMethodField()

    class Meta:
        model = UserProfile
        fields = [
            'id',
            'username',
            'email',
            'phone_number',
            'national_id',
            'first_name',
            'last_name',
            'full_name',
            'roles',
            'is_verified',
            'is_active',
            'created_at'
        ]
        read_only_fields = ['id', 'created_at']

    def get_full_name(self, obj):
        return obj.get_full_name()


class UserDetailSerializer(serializers.ModelSerializer):
    roles = RoleSerializer(many=True, read_only=True)
    full_name = serializers.SerializerMethodField()

    class Meta:
        model = UserProfile
        fields = [
            'id',
            'username',
            'email',
            'phone_number',
            'national_id',
            'first_name',
            'last_name',
            'full_name',
            'roles',
            'is_verified',
            'is_active',
            'created_at',
            'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_full_name(self, obj):
        return obj.get_full_name()


class UserUpdateSerializer(serializers.ModelSerializer):
    roles = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=Role.objects.filter(is_active=True),
        required=False
    )

    class Meta:
        model = UserProfile
        fields = [
            'email',
            'phone_number',
            'first_name',
            'last_name',
            'roles',
            'is_verified',
            'is_active'
        ]

    def update(self, instance, validated_data):
        roles_data = validated_data.pop('roles', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        if roles_data is not None:
            instance.roles.set(roles_data)

        return instance


class RoleCreateUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Role
        fields = ['id', 'name', 'description', 'is_active']
        read_only_fields = ['id']

