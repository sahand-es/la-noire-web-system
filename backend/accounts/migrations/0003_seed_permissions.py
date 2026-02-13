# Data migration: seed ActionPermission and assign to roles (PROJECT-en.md §2.2–4).
# Reuses data from seed_permissions command; runs only when accounts.Role has .permissions.

from django.db import migrations

from accounts.management.commands.seed_permissions import PERMISSIONS, ROLE_PERMISSIONS


def run_seed(apps, schema_editor):
    ActionPermission = apps.get_model('accounts', 'ActionPermission')
    Role = apps.get_model('accounts', 'Role')
    if not hasattr(Role, 'permissions'):
        return
    for codename, name in PERMISSIONS:
        ActionPermission.objects.get_or_create(
            codename=codename,
            defaults={'name': name},
        )
    for role_name, codenames in ROLE_PERMISSIONS.items():
        role, _ = Role.objects.get_or_create(
            name=role_name,
            defaults={'is_active': True},
        )
        perms = list(ActionPermission.objects.filter(codename__in=codenames))
        role.permissions.add(*perms)


def noop(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0002_actionpermission_role_permissions'),
    ]

    operations = [
        migrations.RunPython(run_seed, noop),
    ]
