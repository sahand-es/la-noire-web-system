"""
Seed ActionPermission rows and assign them to roles (RBAC).

Same data is applied by migration accounts.0003_seed_permissions. Run this
command to re-seed (e.g. after adding new permissions here) or when using
core.Role (migration no-ops). Permissions are then manageable in admin.
"""
from django.core.management.base import BaseCommand

from accounts.models import ActionPermission, Role


# Permission codenames and which role names get them (PROJECT-en.md Ch 2–4)
PERMISSIONS = [
    ('role.system_admin', 'System Administrator role'),
    ('role.police_chief', 'Police Chief role'),
    ('role.captain', 'Captain role'),
    ('role.sergeant', 'Sergeant role'),
    ('role.detective', 'Detective role'),
    ('role.police_officer', 'Police Officer role'),
    ('role.cadet', 'Cadet role'),
    ('role.coroner', 'Coroner role'),
    ('role.judge', 'Judge role'),
    ('accounts.manage_roles', 'Manage roles (CRUD)'),
    ('accounts.manage_users', 'Manage users (CRUD, assign roles)'),
    ('case.create', 'Create case (crime scene)'),
    ('case.list', 'List cases'),
    ('case.retrieve', 'View case'),
    ('case.update', 'Update case'),
    ('case.approve', 'Approve case'),
    ('case.assign_detective', 'Assign detective to case'),
    ('case.statistics', 'View case statistics'),
    ('complaint.create', 'Create complaint'),
    ('complaint.list', 'List complaints'),
    ('complaint.review_cadet', 'Cadet review complaint'),
    ('complaint.review_officer', 'Officer review complaint'),
    ('evidence.add', 'Add evidence (any type)'),
    ('evidence.coroner_approve', 'Coroner approve biological evidence'),
    ('reward.create', 'Submit reward info'),
    ('reward.review_officer', 'Officer review reward'),
    ('reward.review_detective', 'Detective review reward'),
    ('reward.lookup', 'Look up reward by national ID + code'),
    ('resolution.detective_board', 'Detective board / evidence links'),
    ('resolution.sergeant_review', 'Sergeant review detective report'),
]

ROLE_PERMISSIONS = {
    'System Administrator': [
        'role.system_admin', 'accounts.manage_roles', 'accounts.manage_users',
        'case.list', 'case.retrieve', 'case.update', 'case.approve', 'case.assign_detective',
        'case.statistics', 'complaint.list', 'complaint.review_cadet', 'complaint.review_officer',
        'evidence.add', 'evidence.coroner_approve', 'reward.review_officer', 'reward.review_detective',
        'reward.lookup', 'resolution.detective_board', 'resolution.sergeant_review',
    ],
    'Police Chief': [
        'role.police_chief', 'case.create', 'case.list', 'case.retrieve', 'case.update',
        'case.approve', 'case.assign_detective', 'case.statistics', 'complaint.list',
        'complaint.review_officer', 'evidence.add', 'reward.review_officer', 'reward.lookup',
        'resolution.detective_board', 'resolution.sergeant_review',
    ],
    'Captain': [
        'role.captain', 'case.create', 'case.list', 'case.retrieve', 'case.update',
        'case.approve', 'case.assign_detective', 'case.statistics', 'complaint.list',
        'complaint.review_officer', 'evidence.add', 'reward.review_officer', 'reward.lookup',
        'resolution.detective_board', 'resolution.sergeant_review',
    ],
    'Sergeant': [
        'role.sergeant', 'case.create', 'case.list', 'case.retrieve', 'case.update',
        'case.approve', 'case.assign_detective', 'case.statistics', 'complaint.list',
        'complaint.review_officer', 'evidence.add', 'reward.review_officer', 'reward.lookup',
        'resolution.detective_board', 'resolution.sergeant_review',
    ],
    'Detective': [
        'role.detective', 'case.list', 'case.retrieve', 'case.update', 'case.statistics',
        'complaint.list', 'evidence.add', 'reward.review_detective', 'reward.lookup',
        'resolution.detective_board',
    ],
    'Police Officer': [
        'role.police_officer', 'case.create', 'case.list', 'case.retrieve', 'case.approve',
        'complaint.list', 'complaint.review_officer', 'evidence.add', 'reward.review_officer',
        'reward.lookup',
    ],
    'Cadet': [
        'role.cadet', 'case.list', 'case.retrieve', 'complaint.list', 'complaint.review_cadet',
        'evidence.add', 'reward.lookup',
    ],
    'Coroner': [
        'role.coroner', 'evidence.add', 'evidence.coroner_approve',
    ],
    'Judge': [
        'role.judge',
    ],
    'Base user': [
        'complaint.create', 'reward.create',
    ],
}


class Command(BaseCommand):
    help = 'Create action permissions and assign them to roles (RBAC seed).'

    def handle(self, *args, **options):
        if not hasattr(Role, 'permissions'):
            self.stdout.write(
                self.style.WARNING('Role model has no "permissions" M2M. Skip seed.')
            )
            return

        created_count = 0
        for codename, name in PERMISSIONS:
            _, created = ActionPermission.objects.get_or_create(
                codename=codename,
                defaults={'name': name},
            )
            if created:
                created_count += 1
                self.stdout.write(self.style.SUCCESS(f'  + {codename}'))

        self.stdout.write(self.style.SUCCESS(f'\nPermissions: {created_count} created, {len(PERMISSIONS)} total.'))

        for role_name, codenames in ROLE_PERMISSIONS.items():
            role = Role.objects.filter(name=role_name, is_active=True).first()
            if not role:
                self.stdout.write(self.style.WARNING(f'  Role "{role_name}" not found, skip.'))
                continue
            perms = ActionPermission.objects.filter(codename__in=codenames)
            role.permissions.add(*perms)
            self.stdout.write(self.style.SUCCESS(f'  Assigned {perms.count()} permissions to {role_name}'))

        self.stdout.write(self.style.SUCCESS('\nDone.'))
