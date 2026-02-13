"""
Intensive Pursuit page: suspects under pursuit for more than one month (PROJECT 307-316).
All users can see. Ranking = max(Lj)·max(Di), reward = ranking · 20,000,000 Rials.
"""
from datetime import timedelta
from django.utils import timezone
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from investigation.models import Suspect
from investigation.serializers.suspect import IntensivePursuitSerializer


class IntensivePursuitViewSet(viewsets.ReadOnlyModelViewSet):
    """
    List of suspects in Intensive Pursuit status (under pursuit > 30 days).
    Page that all users can see; each entry has photo, details, ranking, reward.
    """
    serializer_class = IntensivePursuitSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        threshold = timezone.now() - timedelta(days=30)
        return Suspect.objects.filter(
            is_wanted=True,
            pursuit_start_date__isnull=False,
            pursuit_start_date__lte=threshold,
            case_links__case__status__in=['OPEN', 'UNDER_INVESTIGATION'],
        ).distinct().prefetch_related('case_links__case')

    def list(self, request, *args, **kwargs):
        qs = self.get_queryset()
        suspects = list(qs)
        suspects.sort(key=lambda s: s.get_pursuit_priority(), reverse=True)
        page = self.paginate_queryset(suspects)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = self.get_serializer(suspects, many=True)
        return Response(serializer.data)
