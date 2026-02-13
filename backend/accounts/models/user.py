from django.db import models
from django.contrib.auth.models import AbstractUser
from django.contrib.auth.models import Group, Permission

from core.models import BaseModel


class Role(BaseModel):
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    permissions = models.ManyToManyField(
        'accounts.ActionPermission',
        related_name='roles',
        blank=True,
        help_text='Action permissions granted to this role (RBAC).',
    )

    class Meta:
        ordering = ['name']
        app_label = 'accounts'

    def __str__(self):
        return self.name


class UserProfile(AbstractUser):
    email = models.EmailField(unique=True)
    phone_number = models.CharField(max_length=15, unique=True)
    national_id = models.CharField(max_length=10, unique=True)
    first_name = models.CharField(max_length=50)
    last_name = models.CharField(max_length=50)
    groups = models.ManyToManyField(
        Group,
        blank=True,
        related_name='accounts_userprofile_set',
        related_query_name='accounts_user',
        verbose_name='groups',
        help_text='The groups this user belongs to.',
    )
    user_permissions = models.ManyToManyField(
        Permission,
        blank=True,
        related_name='accounts_userprofile_set',
        related_query_name='accounts_user',
        verbose_name='user permissions',
        help_text='Specific permissions for this user.',
    )
    roles = models.ManyToManyField(
        Role,
        related_name='accounts_users',
        related_query_name='accounts_user',
        blank=True,
    )
    is_verified = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    USERNAME_FIELD = 'username'
    REQUIRED_FIELDS = ['email', 'phone_number', 'national_id', 'first_name', 'last_name']

    class Meta:
        ordering = ['-created_at']
        app_label = 'accounts'

    def __str__(self):
        return f"{self.get_full_name()} ({self.username})"

    def has_role(self, role_name):
        return self.roles.filter(name=role_name, is_active=True).exists()

    def has_any_role(self, role_names):
        return self.roles.filter(name__in=role_names, is_active=True).exists()

    def has_perm(self, codename):
        """True if user is superuser or any of their roles has this action permission."""
        if self.is_superuser:
            return True
        return self.roles.filter(
            is_active=True,
            permissions__codename=codename,
        ).exists()
