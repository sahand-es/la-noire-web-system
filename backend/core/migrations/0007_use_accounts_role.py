# Generated manually: use accounts.Role for core.UserProfile.roles and remove core.Role

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0006_remove_reward_teamreward'),
        ('accounts', '0001_initial'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='userprofile',
            name='roles',
        ),
        migrations.DeleteModel(
            name='Role',
        ),
        migrations.AddField(
            model_name='userprofile',
            name='roles',
            field=models.ManyToManyField(
                blank=True,
                related_name='users',
                to='accounts.role',
            ),
        ),
    ]
