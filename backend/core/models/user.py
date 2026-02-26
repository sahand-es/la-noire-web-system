from django.db import models
from django.contrib.auth.models import AbstractUser
from .base import BaseModel


class UserProfile(AbstractUser):
    SYSTEM_ADMIN_ROLE = 'System Administrator'

    email = models.EmailField(unique=True)
    phone_number = models.CharField(max_length=15, unique=True)
    national_id = models.CharField(max_length=10, unique=True)
    first_name = models.CharField(max_length=50)
    last_name = models.CharField(max_length=50)
    roles = models.ManyToManyField(
        'accounts.Role',
        related_name='users',
        blank=True,
    )
    is_verified = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    USERNAME_FIELD = 'username'
    REQUIRED_FIELDS = ['email', 'phone_number', 'national_id', 'first_name', 'last_name']
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.get_full_name()} ({self.username})"
    
    def has_role(self, role_name):
        return self.roles.filter(name=role_name, is_active=True).exists()
    
    def has_any_role(self, role_names):
        return self.roles.filter(name__in=role_names, is_active=True).exists()

    def is_system_administrator(self):
        return self.has_role(self.SYSTEM_ADMIN_ROLE)

    def has_perm(self, perm, obj=None):
        if self.is_active and (self.is_superuser or self.is_system_administrator()):
            return True
        return super().has_perm(perm, obj=obj)

    def has_module_perms(self, app_label):
        if self.is_active and (self.is_superuser or self.is_system_administrator()):
            return True
        return super().has_module_perms(app_label)
