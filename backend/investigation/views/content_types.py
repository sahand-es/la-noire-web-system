from django.contrib.contenttypes.models import ContentType
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from cases.models import (
    WitnessTestimony,
    BiologicalEvidence,
    VehicleEvidence,
    DocumentEvidence,
    OtherEvidence,
)


class ContentTypeViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]

    def list(self, request):
        mapping = ContentType.objects.get_for_models(
            WitnessTestimony,
            BiologicalEvidence,
            VehicleEvidence,
            DocumentEvidence,
            OtherEvidence,
        )

        data = []
        for model_class, ct in mapping.items():
            data.append({
                "id": ct.id,
                "app_label": ct.app_label,
                "model": ct.model,
            })

        return Response({"status": "success", "data": data})