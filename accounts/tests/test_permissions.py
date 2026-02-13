"""
Tests for accounts.permissions: high-level permission logic only.
Avoids depending on specific role names, codenames, or view attribute names.
"""
from unittest import skipUnless

from django.test import TestCase
from django.contrib.auth import get_user_model
from django.contrib.auth.models import AnonymousUser
from rest_framework.test import APIRequestFactory
from rest_framework.request import Request

from accounts.permissions import (
    user_has_perm,
    HasPermission,
    HasAnyRole,
    IsComplainant,
)

User = get_user_model()


def _role_model():
    """Role model used by the user's .roles M2M (core or accounts)."""
    through = User.roles.through
    try:
        return through._meta.get_field('role').remote_field.model
    except Exception:
        for f in through._meta.get_fields():
            if getattr(f, 'remote_field', None):
                model = getattr(f.remote_field, 'model', None)
                if model and model != User and model.__name__ == 'Role':
                    return model
    raise ValueError('Could not resolve Role from User.roles')


def _role_has_permissions():
    return hasattr(_role_model(), 'permissions')


def _make_user(**kwargs):
    """Create a user; username= is used to derive unique email/phone/national_id."""
    username = kwargs.pop('username', None) or 'u'
    h = abs(hash(username)) % (10**12)
    defaults = dict(
        username=username,
        email=f'{username}@test.com',
        phone_number=f'09{h:013d}'[:15],
        national_id=f'{h:010d}'[:10],
        first_name='F',
        last_name='L',
        password='TestPass123!',
    )
    defaults.update(kwargs)
    return User.objects.create_user(**defaults)


def _make_request(user=None):
    factory = APIRequestFactory()
    raw = factory.get('/')
    if user is not None:
        raw.user = user
    else:
        raw.user = AnonymousUser()
    req = Request(raw)
    req._user = raw.user  # so request.user in permission code sees our user
    return req


# --- user_has_perm ---


class UserHasPermTests(TestCase):
    """user_has_perm: unauthenticated -> False, superuser -> True, no roles -> False."""

    def test_unauthenticated_returns_false(self):
        self.assertFalse(user_has_perm(None, 'any.perm'))
        self.assertFalse(user_has_perm(AnonymousUser(), 'any.perm'))

    def test_superuser_returns_true_for_any_codename(self):
        user = _make_user(username='sup', is_superuser=True)
        self.assertTrue(user_has_perm(user, 'any.perm'))

    def test_authenticated_user_with_no_roles_returns_false(self):
        user = _make_user(username='norole')
        self.assertFalse(user_has_perm(user, 'some.perm'))


@skipUnless(_role_has_permissions(), 'Role model has no permissions M2M')
class UserHasPermWithRolePermissionsTests(TestCase):
    """user_has_perm when Role has .permissions: allows when a role has the codename."""

    def setUp(self):
        from accounts.models import ActionPermission
        Role = _role_model()
        self.perm = ActionPermission.objects.create(codename='test.perm', name='Test')
        self.role = Role.objects.create(name='SomeRole', is_active=True)
        self.role.permissions.add(self.perm)
        self.user = _make_user(username='withrole')
        self.user.roles.add(self.role)

    def test_allows_when_role_has_permission(self):
        self.assertTrue(user_has_perm(self.user, 'test.perm'))

    def test_denies_when_role_lacks_that_codename(self):
        self.assertFalse(user_has_perm(self.user, 'other.perm'))


# --- HasPermission (view required_permission / required_permissions) ---


class HasPermissionTests(TestCase):
    """HasPermission: denies when view has no required permission; denies when user lacks it; allows superuser."""

    def test_denies_when_view_has_no_required_permission(self):
        perm = HasPermission()
        request = _make_request(_make_user(username='u'))
        view = type('View', (), {})()
        self.assertFalse(perm.has_permission(request, view))

    def test_denies_authenticated_user_without_permission(self):
        perm = HasPermission()
        request = _make_request(_make_user(username='u'))
        view = type('View', (), {'required_permission': 'some.perm'})()
        self.assertFalse(perm.has_permission(request, view))

    def test_allows_superuser(self):
        user = _make_user(username='sup', is_superuser=True)
        perm = HasPermission()
        request = _make_request(user)
        view = type('View', (), {'required_permission': 'some.perm'})()
        self.assertTrue(perm.has_permission(request, view))

    @skipUnless(_role_has_permissions(), 'Role model has no permissions M2M')
    def test_allows_when_user_role_has_required_permission(self):
        from accounts.models import ActionPermission
        Role = _role_model()
        ap = ActionPermission.objects.create(codename='req.perm', name='Req')
        role = Role.objects.create(name='R', is_active=True)
        role.permissions.add(ap)
        user = _make_user(username='u')
        user.roles.add(role)
        perm = HasPermission()
        request = _make_request(user)
        view = type('View', (), {'required_permission': 'req.perm'})()
        self.assertTrue(perm.has_permission(request, view))


# --- HasAnyRole (view required_roles or permission role_names) ---


class HasAnyRoleTests(TestCase):
    """HasAnyRole: denies unauthenticated; allows when user has one of required_roles; denies when not."""

    def setUp(self):
        Role = _role_model()
        self.role_a = Role.objects.create(name='RoleA', is_active=True)
        self.role_b = Role.objects.create(name='RoleB', is_active=True)
        self.user_a = _make_user(username='usera')
        self.user_a.roles.add(self.role_a)
        self.user_b = _make_user(username='userb')
        self.user_b.roles.add(self.role_b)

    def test_denies_unauthenticated(self):
        perm = HasAnyRole()
        request = _make_request(None)
        view = type('View', (), {'required_roles': ['RoleA']})()
        self.assertFalse(perm.has_permission(request, view))

    def test_allows_when_user_has_required_role(self):
        perm = HasAnyRole()
        request = _make_request(self.user_a)
        view = type('View', (), {'required_roles': ['RoleA']})()
        self.assertTrue(perm.has_permission(request, view))

    def test_denies_when_user_lacks_required_role(self):
        perm = HasAnyRole()
        request = _make_request(self.user_b)
        view = type('View', (), {'required_roles': ['RoleA']})()
        self.assertFalse(perm.has_permission(request, view))


# --- IsComplainant ---


class IsComplainantTests(TestCase):
    """IsComplainant: has_permission allows authenticated; has_object_permission allows complainant or superuser."""

    def test_has_permission_allows_authenticated(self):
        perm = IsComplainant()
        request = _make_request(_make_user(username='u'))
        view = type('View', (), {})()
        self.assertTrue(perm.has_permission(request, view))

    def test_has_permission_denies_unauthenticated(self):
        perm = IsComplainant()
        request = _make_request(None)
        view = type('View', (), {})()
        self.assertFalse(perm.has_permission(request, view))

    def test_has_object_permission_allows_when_user_is_complainant(self):
        user = _make_user(username='u')
        perm = IsComplainant()
        request = _make_request(user)
        view = type('View', (), {})()
        obj = type('Obj', (), {'complainant': user})()
        self.assertTrue(perm.has_object_permission(request, view, obj))

    def test_has_object_permission_denies_when_user_is_not_complainant(self):
        user = _make_user(username='u')
        other = _make_user(username='other')
        perm = IsComplainant()
        request = _make_request(other)
        view = type('View', (), {})()
        obj = type('Obj', (), {'complainant': user})()
        self.assertFalse(perm.has_object_permission(request, view, obj))

    def test_has_object_permission_allows_superuser_even_if_not_complainant(self):
        user = _make_user(username='u')
        superuser = _make_user(username='sup', is_superuser=True)
        perm = IsComplainant()
        request = _make_request(superuser)
        view = type('View', (), {})()
        obj = type('Obj', (), {'complainant': user})()
        self.assertTrue(perm.has_object_permission(request, view, obj))
