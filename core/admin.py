from django.contrib import admin

from .models import (
    Suspect,
    Interrogation,
    Trial,
    Reward,
    Document,
    Payment,
    Bail,
)


@admin.register(Suspect)
class SuspectAdmin(admin.ModelAdmin):
    pass


@admin.register(Interrogation)
class InterrogationAdmin(admin.ModelAdmin):
    pass


@admin.register(Trial)
class TrialAdmin(admin.ModelAdmin):
    pass


@admin.register(Reward)
class RewardAdmin(admin.ModelAdmin):
    pass


@admin.register(Document)
class DocumentAdmin(admin.ModelAdmin):
    pass


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    pass


@admin.register(Bail)
class BailAdmin(admin.ModelAdmin):
    pass
