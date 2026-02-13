from django.core.management.base import BaseCommand
from core.models import Role


class Command(BaseCommand):
    help = 'Create default roles for the L.A. Noire system'

    ROLES = [
        {
            'name': 'System Administrator',
            'description': 'Full system access. Can manage users, roles, and all entities.'
        },
        {
            'name': 'Police Chief',
            'description': 'Highest police rank. Can approve cases and manage critical crimes.'
        },
        {
            'name': 'Captain',
            'description': 'Captain rank. Can approve cases and manage operations.'
        },
        {
            'name': 'Sergeant',
            'description': 'Sergeant rank. Can issue warrants and manage interrogations.'
        },
        {
            'name': 'Detective',
            'description': 'Detective rank. Investigates cases and gathers evidence.'
        },
        {
            'name': 'Police Officer',
            'description': 'Police Officer / Patrol Officer rank. Reports crimes and maintains order.'
        },
        {
            'name': 'Cadet',
            'description': 'Cadet rank. Filters and validates complaints.'
        },
        {
            'name': 'Coroner',
            'description': 'Reviews and approves biological and medical evidence.'
        },
        {
            'name': 'Judge',
            'description': 'Reviews cases and determines verdicts.'
        },
        {
            'name': 'Base user',
            'description': 'Default role for registered users. Can file complaints and provide information.'
        }
    ]

    def handle(self, *args, **options):
        for role_data in self.ROLES:
            role, created = Role.objects.get_or_create(
                name=role_data['name'],
                defaults={'description': role_data['description'], 'is_active': True}
            )

            if created:
                self.stdout.write(
                    self.style.SUCCESS(f'✓ Created role: {role.name}')
                )
            else:
                self.stdout.write(
                    self.style.WARNING(f'- Role already exists: {role.name}')
                )

        total = len(self.ROLES)
        self.stdout.write(
            self.style.SUCCESS(f'\nCompleted! Total roles: {total}')
        )
