from django.contrib.auth.backends import ModelBackend
from django.db.models import Q
from .models import UserProfile


class MultiFieldAuthBackend(ModelBackend):
    def authenticate(self, request, username=None, password=None, **kwargs):
        if not username or not password:
            return None

        try:
            user = UserProfile.objects.get(
                Q(username=username) |
                Q(email=username) |
                Q(phone_number=username) |
                Q(national_id=username)
            )

            if user.check_password(password) and self.user_can_authenticate(user):
                return user
        except UserProfile.DoesNotExist:
            return None
        except UserProfile.MultipleObjectsReturned:
            return None

        return None
