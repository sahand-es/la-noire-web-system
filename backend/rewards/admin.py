from django.contrib import admin
from .models import Reward, TeamReward


@admin.register(Reward)
class RewardAdmin(admin.ModelAdmin):
    list_display = ['reward_code', 'recipient', 'case', 'amount', 'status', 'is_civilian_reward', 'created_at']
    list_filter = ['status', 'is_civilian_reward', 'reward_type']


@admin.register(TeamReward)
class TeamRewardAdmin(admin.ModelAdmin):
    list_display = ['case', 'total_amount', 'status', 'distribution_completed', 'created_at']
    list_filter = ['status', 'distribution_completed']
