from django.db import models
from django.contrib.auth.models import AbstractUser
from .base import BaseModel


class Role(BaseModel):
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    
    class Meta:
        ordering = ['name']
    
    def __str__(self):
        return self.name


class UserProfile(AbstractUser):
    email = models.EmailField(unique=True)
    phone_number = models.CharField(max_length=15, unique=True)
    national_id = models.CharField(max_length=10, unique=True)
    first_name = models.CharField(max_length=50)
    last_name = models.CharField(max_length=50)
    roles = models.ManyToManyField(Role, related_name='users', blank=True)
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
