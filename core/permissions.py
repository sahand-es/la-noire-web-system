from rest_framework.permissions import BasePermission


def _is_superuser(user):
    return bool(user and user.is_authenticated and getattr(user, 'is_superuser', False))


def _user_has_roles(user, roles):
    if not user or not user.is_authenticated:
        return False

    if _is_superuser(user):
        return True

    if not roles:
        return True

    if isinstance(roles, str):
        roles = [roles]

    return user.has_any_role(roles)


class HasRole(BasePermission):
    def has_permission(self, request, view):
        required_roles = getattr(view, 'required_roles', [])
        return _user_has_roles(request.user, required_roles)


class IsSystemAdmin(BasePermission):
    def has_permission(self, request, view):
        return _user_has_roles(request.user, 'System Administrator')


class IsPoliceChief(BasePermission):
    def has_permission(self, request, view):
        return _user_has_roles(request.user, 'Police Chief')


class IsCaptain(BasePermission):
    def has_permission(self, request, view):
        return _user_has_roles(request.user, 'Captain')


class IsSergeant(BasePermission):
    def has_permission(self, request, view):
        return _user_has_roles(request.user, 'Sergeant')


class IsDetective(BasePermission):
    def has_permission(self, request, view):
        return _user_has_roles(request.user, 'Detective')


class IsPoliceOfficer(BasePermission):
    def has_permission(self, request, view):
        return _user_has_roles(request.user, 'Police Officer')


class IsCadet(BasePermission):
    def has_permission(self, request, view):
        return _user_has_roles(request.user, 'Cadet')


class IsCoroner(BasePermission):
    def has_permission(self, request, view):
        return _user_has_roles(request.user, 'Coroner')


class IsJudge(BasePermission):
    def has_permission(self, request, view):
        return _user_has_roles(request.user, 'Judge')


class IsComplainant(BasePermission):
    def has_permission(self, request, view):
        return _is_superuser(request.user) or (request.user and request.user.is_authenticated)

    def has_object_permission(self, request, view, obj):
        return _is_superuser(request.user) or obj.complainant == request.user


class IsOfficer(BasePermission):
    def has_permission(self, request, view):
        return _user_has_roles(request.user, [
            'Police Officer', 'Detective', 'Sergeant', 'Captain', 'Police Chief'
        ])


class IsCadetOrOfficer(BasePermission):
    def has_permission(self, request, view):
        return _user_has_roles(request.user, [
            'Cadet', 'Police Officer', 'Detective', 'Sergeant', 'Captain', 'Police Chief'
        ])


class IsPoliceRankExceptCadet(BasePermission):
    def has_permission(self, request, view):
        return _user_has_roles(request.user, [
            'Police Officer', 'Detective', 'Sergeant', 'Captain', 'Police Chief'
        ])


class IsDetectiveOrSergeantOrChief(BasePermission):
    def has_permission(self, request, view):
        return _user_has_roles(request.user, [
            'Detective', 'Sergeant', 'Police Chief'
        ])


class IsSergeantOrCaptainOrChief(BasePermission):
    def has_permission(self, request, view):
        return _user_has_roles(request.user, [
            'Sergeant', 'Captain', 'Police Chief'
        ])