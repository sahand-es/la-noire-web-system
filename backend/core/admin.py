from django.contrib import admin

from .models import (
    Document,
    Payment,
    Bail,
)


@admin.register(Document)
class DocumentAdmin(admin.ModelAdmin):
    pass


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    pass


@admin.register(Bail)
class BailAdmin(admin.ModelAdmin):
    pass
