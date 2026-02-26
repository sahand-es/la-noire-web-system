"""
RBAC: database-driven permissions + role-name fallback (PROJECT-en.md §2.2).

Design:
- ActionPermission: codename (e.g. 'case.create', 'role.detective') stored in DB.
- Role has M2M to ActionPermission. Admin can assign permissions to roles without code change.
- Views set required_permission = 'case.create' (or required_permissions = ['a', 'b']).
- HasPermission checks: user has any role that has that permission (or superuser).
- Role-name classes (IsDetective, IsCadetOrOfficer, ...) remain for backward compatibility;
  they use required_roles and can be migrated to HasPermission('role.detective') once
  permissions are seeded.
"""
from rest_framework.permissions import BasePermission


def _is_superuser(user):
    return bool(user and user.is_authenticated and getattr(user, 'is_superuser', False))


def user_has_perm(user, codename):
    """
    True if user is superuser or any of their roles has this action permission.
    Works for any user model with .roles (M2M); roles must have .permissions (M2M to ActionPermission).
    Checks role-based ActionPermission first; only falls back to Django's has_perm for auth permissions.
    """
    if not user or not user.is_authenticated:
        return False
    if _is_superuser(user):
        return True
    roles = getattr(user, 'roles', None)
    if roles is not None and roles.filter(is_active=True, permissions__codename=codename).exists():
        return True
    if hasattr(user, 'has_perm'):
        return user.has_perm(codename)
    return False


def _user_has_any_role(user, roles):
    if not user or not user.is_authenticated:
        return False
    if _is_superuser(user):
        return True
    if not roles:
        return True
    if isinstance(roles, str):
        roles = (roles,)
    return user.has_any_role(list(roles))


# --- Permission-codename driven (DB) ---


class HasPermission(BasePermission):
    """
    Allow access if the user has the required action permission (via their roles).
    View must set required_permission = 'codename' or required_permissions = ['a', 'b'].
    Permissions are stored in ActionPermission and assigned to Role in the admin.
    """
    def has_permission(self, request, view):
        codenames = getattr(view, 'required_permissions', None) or getattr(
            view, 'required_permission', None
        )
        if codenames is None:
            return False
        if isinstance(codenames, str):
            codenames = (codenames,)
        for codename in codenames:
            if user_has_perm(request.user, codename):
                return True
        return False


# --- Role-name driven (backward compatible; PROJECT-en.md user levels) ---

# Single source of truth for role names (match create_default_roles)
SYSTEM_ADMIN = 'System Administrator'
POLICE_CHIEF = 'Police Chief'
CAPTAIN = 'Captain'
SERGEANT = 'Sergeant'
DETECTIVE = 'Detective'
POLICE_OFFICER = 'Police Officer'
CADET = 'Cadet'
CORONER = 'Coroner'
JUDGE = 'Judge'
BASE_USER = 'Base user'

OFFICER_ROLES = (POLICE_OFFICER, DETECTIVE, SERGEANT, CAPTAIN, POLICE_CHIEF)
CADET_OR_OFFICER_ROLES = (CADET,) + OFFICER_ROLES
DETECTIVE_SERGEANT_CHIEF_ROLES = (DETECTIVE, SERGEANT, POLICE_CHIEF)
SERGEANT_CAPTAIN_CHIEF_ROLES = (SERGEANT, CAPTAIN, POLICE_CHIEF)


class HasAnyRole(BasePermission):
    """Allow access if user has at least one of the given roles (view.required_roles or role_names)."""
    role_names = ()

    def has_permission(self, request, view):
        roles = getattr(view, 'required_roles', None)
        if roles is None:
            roles = self.role_names
        return _user_has_any_role(request.user, roles)


# Single-role
class IsSystemAdmin(HasAnyRole):
    role_names = (SYSTEM_ADMIN,)


class IsPoliceChief(HasAnyRole):
    role_names = (POLICE_CHIEF,)


class IsCaptain(HasAnyRole):
    role_names = (CAPTAIN,)


class IsSergeant(HasAnyRole):
    role_names = (SERGEANT,)


class IsDetective(HasAnyRole):
    role_names = (DETECTIVE,)


class IsPoliceOfficer(HasAnyRole):
    role_names = (POLICE_OFFICER,)


class IsCadet(HasAnyRole):
    role_names = (CADET,)


class IsCoroner(HasAnyRole):
    role_names = (CORONER,)


class IsJudge(HasAnyRole):
    role_names = (JUDGE,)


# Composite
class IsOfficer(HasAnyRole):
    role_names = OFFICER_ROLES


class IsCadetOrOfficer(HasAnyRole):
    role_names = CADET_OR_OFFICER_ROLES


class IsPoliceRankExceptCadet(HasAnyRole):
    role_names = OFFICER_ROLES


class IsDetectiveOrSergeantOrChief(HasAnyRole):
    role_names = DETECTIVE_SERGEANT_CHIEF_ROLES


class IsSergeantOrCaptainOrChief(HasAnyRole):
    role_names = SERGEANT_CAPTAIN_CHIEF_ROLES


class IsSergeantOrCaptainOrChiefOrAdmin(IsSergeantOrCaptainOrChief):
    """Allow Sergeant, Captain, Police Chief, or superuser."""

    def has_permission(self, request, view):
        return _is_superuser(request.user) or super().has_permission(request, view)


# Object-level
class IsComplainant(BasePermission):
    def has_permission(self, request, view):
        return _is_superuser(request.user) or (request.user and request.user.is_authenticated)

    def has_object_permission(self, request, view, obj):
        return _is_superuser(request.user) or getattr(obj, 'complainant', None) == request.user


HasRole = HasAnyRole
