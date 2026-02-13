from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from core.models import Role

User = get_user_model()


class Command(BaseCommand):
    help = 'Create a system administrator user'

    def add_arguments(self, parser):
        parser.add_argument(
            '--username',
            type=str,
            help='Username for the admin user'
        )
        parser.add_argument(
            '--email',
            type=str,
            help='Email for the admin user'
        )
        parser.add_argument(
            '--phone_number',
            type=str,
            help='Phone number for the admin user (format: 09XXXXXXXXX)'
        )
        parser.add_argument(
            '--national_id',
            type=str,
            help='National ID for the admin user (10 digits)'
        )
        parser.add_argument(
            '--first_name',
            type=str,
            default='Admin',
            help='First name for the admin user'
        )
        parser.add_argument(
            '--last_name',
            type=str,
            default='User',
            help='Last name for the admin user'
        )
        parser.add_argument(
            '--password',
            type=str,
            help='Password for the admin user'
        )

    def handle(self, *args, **options):
        username = options.get('username') or self.prompt_for('Username', 'admin')
        email = options.get('email') or self.prompt_for('Email', 'admin@police.local')
        phone_number = options.get('phone_number') or self.prompt_for('Phone Number', '09000000000')
        national_id = options.get('national_id') or self.prompt_for('National ID', '0000000000')
        first_name = options.get('first_name', 'Admin')
        last_name = options.get('last_name', 'User')
        password = options.get('password') or self.prompt_for('Password', '', hide_input=True)

        if User.objects.filter(username=username).exists():
            self.stdout.write(
                self.style.ERROR(f'✗ User with username "{username}" already exists')
            )
            return

        try:
            admin_user = User.objects.create_superuser(
                username=username,
                email=email,
                password=password,
                phone_number=phone_number,
                national_id=national_id,
                first_name=first_name,
                last_name=last_name
            )

            admin_role = Role.objects.get_or_create(
                name='System Administrator',
                defaults={'description': 'Full system access. Can manage users, roles, and all entities.'}
            )[0]

            admin_user.roles.add(admin_role)

            self.stdout.write(
                self.style.SUCCESS(
                    f'✓ Successfully created system administrator:\n'
                    f'  Username: {username}\n'
                    f'  Email: {email}\n'
                    f'  Name: {first_name} {last_name}'
                )
            )
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'✗ Error creating admin user: {str(e)}')
            )

    def prompt_for(self, prompt, default='', hide_input=False):
        import getpass
        if hide_input:
            return getpass.getpass(f'{prompt}: ')
        elif default:
            user_input = input(f'{prompt} [{default}]: ').strip()
            return user_input if user_input else default
        else:
            return input(f'{prompt}: ').strip()
