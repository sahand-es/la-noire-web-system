from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('investigation', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='detectivereport',
            name='detective_message',
            field=models.TextField(blank=True, help_text='Detective reasoning or notes submitted with the report', verbose_name='Detective Message'),
        ),
        migrations.CreateModel(
            name='ReportedSuspect',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('object_id', models.PositiveIntegerField()),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('report', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='reported_suspects', to='investigation.detectivereport', verbose_name='Detective Report')),
                ('content_type', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='reported_suspects', to='contenttypes.contenttype')),
            ],
            options={
                'verbose_name': 'Reported Suspect',
                'verbose_name_plural': 'Reported Suspects',
                'ordering': ['-created_at'],
            },
        ),
    ]
