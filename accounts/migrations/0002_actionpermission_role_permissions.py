# Generated manually for RBAC (ActionPermission + Role.permissions)

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='ActionPermission',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('codename', models.CharField(db_index=True, max_length=100, unique=True)),
                ('name', models.CharField(help_text='Human-readable description', max_length=255)),
            ],
            options={
                'verbose_name': 'action permission',
                'verbose_name_plural': 'action permissions',
                'ordering': ['codename'],
            },
        ),
        migrations.AddField(
            model_name='role',
            name='permissions',
            field=models.ManyToManyField(
                blank=True,
                help_text='Action permissions granted to this role (RBAC).',
                related_name='roles',
                to='accounts.actionpermission',
            ),
        ),
    ]
