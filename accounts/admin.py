from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from core.models import Role, UserProfile


@admin.register(Role)
class RoleAdmin(admin.ModelAdmin):
    list_display = ['name', 'is_active', 'created_at']
    list_filter = ['is_active', 'created_at']
    search_fields = ['name', 'description']


@admin.register(UserProfile)
class UserProfileAdmin(UserAdmin):
    list_display = ['username', 'email', 'phone_number', 'national_id', 'get_full_name', 'is_verified', 'is_active']
    list_filter = ['is_verified', 'is_active', 'roles', 'created_at']
    search_fields = ['username', 'email', 'phone_number', 'national_id', 'first_name', 'last_name']
    filter_horizontal = ['roles', 'groups', 'user_permissions']

    fieldsets = UserAdmin.fieldsets + (
        ('Additional Info', {'fields': ('phone_number', 'national_id', 'roles', 'is_verified')}),
    )

    add_fieldsets = UserAdmin.add_fieldsets + (
        ('Required Info', {
            'fields': ('email', 'phone_number', 'national_id', 'first_name', 'last_name')
        }),
    )
