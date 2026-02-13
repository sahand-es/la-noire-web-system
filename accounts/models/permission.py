"""
Action-based permissions for RBAC (PROJECT-en.md: role flexibility without code change).

Permissions are stored in DB; admin assigns them to roles. Views declare which
permission codename they require; access is granted if the user has any role that
has that permission.
"""
from django.db import models

from core.models import BaseModel


class ActionPermission(BaseModel):
    """
    A permission that can be assigned to roles.
    Codename is the unique key used in code (e.g. 'case.create', 'complaint.review_cadet').
    """
    codename = models.CharField(max_length=100, unique=True, db_index=True)
    name = models.CharField(max_length=255, help_text='Human-readable description')

    class Meta:
        ordering = ['codename']
        app_label = 'accounts'
        verbose_name = 'action permission'
        verbose_name_plural = 'action permissions'

    def __str__(self):
        return f'{self.codename} ({self.name})'
