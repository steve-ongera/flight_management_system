"""
Paramount Charters FMS — admin.py
"""
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import (
    User, Airport, Aircraft, CrewMember,
    FlightBooking, FlightLeg, MaintenanceLog,
    EmailLog, CommissionSetting,
)


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display  = ['username', 'email', 'first_name', 'last_name', 'role', 'is_active']
    list_filter   = ['role', 'is_active']
    fieldsets     = BaseUserAdmin.fieldsets + (
        ('Paramount FMS', {'fields': ('role', 'phone', 'company', 'avatar_url')}),
    )


@admin.register(Airport)
class AirportAdmin(admin.ModelAdmin):
    list_display = ['code', 'name', 'city', 'country', 'is_active']
    search_fields = ['code', 'name', 'city', 'country']


@admin.register(Aircraft)
class AircraftAdmin(admin.ModelAdmin):
    list_display  = ['registration', 'name', 'category', 'status', 'passenger_capacity', 'hourly_rate_usd']
    list_filter   = ['category', 'status']
    search_fields = ['registration', 'name', 'model']


@admin.register(CrewMember)
class CrewMemberAdmin(admin.ModelAdmin):
    list_display  = ['user', 'crew_role', 'status', 'total_hours', 'license_expiry']
    list_filter   = ['crew_role', 'status']


@admin.register(FlightBooking)
class FlightBookingAdmin(admin.ModelAdmin):
    list_display  = ['reference', 'guest_name', 'origin', 'destination', 'departure_date', 'status', 'quoted_price_usd']
    list_filter   = ['status', 'priority', 'trip_type']
    search_fields = ['guest_name', 'guest_email', 'reference']
    readonly_fields = ['reference', 'commission_usd', 'net_revenue_usd']


@admin.register(MaintenanceLog)
class MaintenanceLogAdmin(admin.ModelAdmin):
    list_display = ['aircraft', 'maintenance_type', 'scheduled_date', 'status', 'cost_usd']
    list_filter  = ['status', 'maintenance_type']


@admin.register(EmailLog)
class EmailLogAdmin(admin.ModelAdmin):
    list_display  = ['to_email', 'subject', 'related_type', 'success', 'sent_at']
    list_filter   = ['success', 'related_type']
    readonly_fields = ['reference', 'sent_at']


@admin.register(CommissionSetting)
class CommissionSettingAdmin(admin.ModelAdmin):
    list_display = ['rate_pct', 'effective_from', 'set_by', 'created_at']