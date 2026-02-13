from django.contrib import admin

from .models import (
    Reward,
    Document,
    Payment,
    Bail,
)


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
