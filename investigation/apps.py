from django.apps import AppConfig


class InvestigationConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'investigation'
    verbose_name = 'Investigation (detective board, suspects, trial)'
