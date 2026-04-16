from rest_framework import serializers
from django.contrib.auth import authenticate
from decimal import Decimal
from .models import (
    User, Airport, Aircraft, CrewMember,
    CharterRequest, Flight, FlightLeg,
    MaintenanceLog, Invoice, EmailLog, Notification,
)


# ─────────────────────────────────────────────────────────────────
# AUTH
# ─────────────────────────────────────────────────────────────────
class UserRegistrationSerializer(serializers.ModelSerializer):
    password  = serializers.CharField(write_only=True, min_length=8)
    password2 = serializers.CharField(write_only=True)

    class Meta:
        model  = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name',
                  'phone', 'company', 'role', 'password', 'password2']
        extra_kwargs = {'role': {'required': False}}

    def validate(self, data):
        if data['password'] != data.pop('password2'):
            raise serializers.ValidationError({'password2': 'Passwords do not match.'})
        return data

    def create(self, validated_data):
        password = validated_data.pop('password')
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user


class UserProfileSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()

    class Meta:
        model  = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'full_name',
                  'phone', 'company', 'role', 'avatar_url', 'license_number', 'created_at']
        read_only_fields = ['id', 'username', 'created_at']

    def get_full_name(self, obj):
        return obj.get_full_name() or obj.username


class UserAdminSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()

    class Meta:
        model  = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'full_name',
                  'phone', 'company', 'role', 'is_active', 'avatar_url',
                  'license_number', 'created_at']

    def get_full_name(self, obj):
        return obj.get_full_name() or obj.username


# ─────────────────────────────────────────────────────────────────
# AIRPORT
# ─────────────────────────────────────────────────────────────────
class AirportSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Airport
        fields = '__all__'


# ─────────────────────────────────────────────────────────────────
# AIRCRAFT
# ─────────────────────────────────────────────────────────────────
class AircraftSerializer(serializers.ModelSerializer):
    category_display          = serializers.CharField(source='get_category_display', read_only=True)
    status_display            = serializers.CharField(source='get_status_display', read_only=True)
    hours_until_maintenance   = serializers.ReadOnlyField()
    maintenance_due           = serializers.ReadOnlyField()
    base_airport_detail       = AirportSerializer(source='base_airport', read_only=True)

    class Meta:
        model  = Aircraft
        fields = '__all__'
        read_only_fields = ['reference', 'created_at', 'updated_at']


class AircraftListSerializer(serializers.ModelSerializer):
    """Lightweight version for dropdowns / lists"""
    category_display = serializers.CharField(source='get_category_display', read_only=True)
    status_display   = serializers.CharField(source='get_status_display', read_only=True)
    maintenance_due  = serializers.ReadOnlyField()

    class Meta:
        model  = Aircraft
        fields = ['id', 'reference', 'tail_number', 'name', 'make', 'model',
                  'category', 'category_display', 'passenger_capacity',
                  'hourly_rate_usd', 'status', 'status_display',
                  'total_flight_hours', 'hours_until_maintenance', 'maintenance_due',
                  'image_url']


# ─────────────────────────────────────────────────────────────────
# CREW
# ─────────────────────────────────────────────────────────────────
class CrewMemberSerializer(serializers.ModelSerializer):
    user_name    = serializers.CharField(source='user.get_full_name', read_only=True)
    user_email   = serializers.EmailField(source='user.email', read_only=True)
    role_display = serializers.CharField(source='get_crew_role_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    base_airport_detail = AirportSerializer(source='base_airport', read_only=True)

    class Meta:
        model  = CrewMember
        fields = '__all__'
        read_only_fields = ['created_at']


# ─────────────────────────────────────────────────────────────────
# CHARTER REQUEST
# ─────────────────────────────────────────────────────────────────
class CharterRequestSerializer(serializers.ModelSerializer):
    reference        = serializers.UUIDField(read_only=True)
    status_display   = serializers.CharField(source='get_status_display', read_only=True)
    origin_detail    = AirportSerializer(source='origin', read_only=True)
    dest_detail      = AirportSerializer(source='destination', read_only=True)

    class Meta:
        model  = CharterRequest
        fields = '__all__'
        read_only_fields = ['reference', 'status', 'created_at']

    def validate(self, data):
        if data.get('trip_type') == 'round_trip' and not data.get('return_date'):
            raise serializers.ValidationError({'return_date': 'Return date required for round trip.'})
        if data.get('return_date') and data.get('departure_date'):
            if data['return_date'] < data['departure_date']:
                raise serializers.ValidationError({'return_date': 'Return date must be after departure date.'})
        return data


# ─────────────────────────────────────────────────────────────────
# FLIGHT LEG
# ─────────────────────────────────────────────────────────────────
class FlightLegSerializer(serializers.ModelSerializer):
    origin_detail = AirportSerializer(source='origin', read_only=True)
    dest_detail   = AirportSerializer(source='destination', read_only=True)

    class Meta:
        model  = FlightLeg
        fields = '__all__'


# ─────────────────────────────────────────────────────────────────
# FLIGHT
# ─────────────────────────────────────────────────────────────────
class FlightSerializer(serializers.ModelSerializer):
    reference          = serializers.UUIDField(read_only=True)
    status_display     = serializers.CharField(source='get_status_display', read_only=True)
    type_display       = serializers.CharField(source='get_flight_type_display', read_only=True)
    origin_detail      = AirportSerializer(source='origin', read_only=True)
    destination_detail = AirportSerializer(source='destination', read_only=True)
    aircraft_detail    = AircraftListSerializer(source='aircraft', read_only=True)
    captain_name       = serializers.SerializerMethodField()
    fo_name            = serializers.SerializerMethodField()
    legs               = FlightLegSerializer(many=True, read_only=True)
    commission_pct_display = serializers.SerializerMethodField()

    class Meta:
        model  = Flight
        fields = '__all__'
        read_only_fields = ['reference', 'commission_usd', 'net_revenue_usd',
                            'created_at', 'updated_at']

    def get_captain_name(self, obj):
        return obj.captain.user.get_full_name() if obj.captain else None

    def get_fo_name(self, obj):
        return obj.first_officer.user.get_full_name() if obj.first_officer else None

    def get_commission_pct_display(self, obj):
        return f"{obj.commission_pct}%"


class FlightCreateSerializer(serializers.ModelSerializer):
    legs_data = FlightLegSerializer(many=True, required=False, write_only=True)

    class Meta:
        model  = Flight
        exclude = ['reference', 'commission_usd', 'net_revenue_usd', 'created_at', 'updated_at']

    def create(self, validated_data):
        legs_data = validated_data.pop('legs_data', [])
        flight = Flight.objects.create(**validated_data)
        for i, leg in enumerate(legs_data, 1):
            FlightLeg.objects.create(flight=flight, leg_number=i, **leg)
        return flight


class FlightPriceSerializer(serializers.Serializer):
    quoted_price_usd = serializers.DecimalField(max_digits=12, decimal_places=2)
    commission_pct   = serializers.DecimalField(max_digits=5, decimal_places=2,
                                                 required=False, allow_null=True)
    status           = serializers.ChoiceField(
        choices=['scheduled','boarding','departed','in_flight','landed','completed','cancelled'],
        required=False
    )
    send_email    = serializers.BooleanField(default=True)
    email_message = serializers.CharField(required=False, default='')


class FlightStatusSerializer(serializers.Serializer):
    status = serializers.ChoiceField(
        choices=['scheduled','boarding','departed','in_flight','landed','completed','cancelled','diverted','delayed']
    )
    actual_departure_dt = serializers.DateTimeField(required=False, allow_null=True)
    actual_arrival_dt   = serializers.DateTimeField(required=False, allow_null=True)
    actual_hours        = serializers.DecimalField(max_digits=5, decimal_places=2,
                                                    required=False, allow_null=True)
    notes = serializers.CharField(required=False, default='')


# ─────────────────────────────────────────────────────────────────
# MAINTENANCE
# ─────────────────────────────────────────────────────────────────
class MaintenanceLogSerializer(serializers.ModelSerializer):
    aircraft_tail    = serializers.CharField(source='aircraft.tail_number', read_only=True)
    aircraft_name    = serializers.CharField(source='aircraft.name', read_only=True)
    type_display     = serializers.CharField(source='get_maintenance_type_display', read_only=True)
    status_display   = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model  = MaintenanceLog
        fields = '__all__'
        read_only_fields = ['created_at']


# ─────────────────────────────────────────────────────────────────
# INVOICE
# ─────────────────────────────────────────────────────────────────
class InvoiceSerializer(serializers.ModelSerializer):
    reference      = serializers.UUIDField(read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    flight_number  = serializers.CharField(source='flight.flight_number', read_only=True)
    route          = serializers.SerializerMethodField()

    class Meta:
        model  = Invoice
        fields = '__all__'
        read_only_fields = ['reference', 'created_at']

    def get_route(self, obj):
        return f"{obj.flight.origin.code} → {obj.flight.destination.code}"


class InvoiceCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Invoice
        exclude = ['reference', 'created_at']


# ─────────────────────────────────────────────────────────────────
# EMAIL LOG
# ─────────────────────────────────────────────────────────────────
class EmailLogSerializer(serializers.ModelSerializer):
    sent_by_name = serializers.CharField(source='sent_by.get_full_name', read_only=True)

    class Meta:
        model  = EmailLog
        fields = '__all__'
        read_only_fields = ['reference', 'sent_at']


class SendEmailSerializer(serializers.Serializer):
    to_email     = serializers.EmailField()
    to_name      = serializers.CharField(required=False, default='')
    subject      = serializers.CharField(max_length=500)
    body         = serializers.CharField()
    email_type   = serializers.CharField(required=False, default='general')
    related_id   = serializers.IntegerField(required=False, allow_null=True)


# ─────────────────────────────────────────────────────────────────
# NOTIFICATION
# ─────────────────────────────────────────────────────────────────
class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Notification
        fields = '__all__'
        read_only_fields = ['user', 'created_at']


# ─────────────────────────────────────────────────────────────────
# PRICE CALCULATOR
# ─────────────────────────────────────────────────────────────────
class PriceCalculatorSerializer(serializers.Serializer):
    aircraft_id      = serializers.IntegerField(required=False, allow_null=True)
    hourly_rate_usd  = serializers.DecimalField(max_digits=10, decimal_places=2, required=False)
    estimated_hours  = serializers.DecimalField(max_digits=6, decimal_places=1)
    passenger_count  = serializers.IntegerField(min_value=1)
    catering         = serializers.BooleanField(default=False)
    ground_transport = serializers.BooleanField(default=False)
    concierge        = serializers.BooleanField(default=False)
    discount_pct     = serializers.DecimalField(max_digits=5, decimal_places=2, default=0)
    commission_pct   = serializers.DecimalField(max_digits=5, decimal_places=2, default=10)


# ─────────────────────────────────────────────────────────────────
# DASHBOARD SUMMARIES
# ─────────────────────────────────────────────────────────────────
class AdminDashboardSerializer(serializers.Serializer):
    total_flights        = serializers.IntegerField()
    scheduled_flights    = serializers.IntegerField()
    completed_flights    = serializers.IntegerField()
    total_revenue_usd    = serializers.DecimalField(max_digits=14, decimal_places=2)
    monthly_revenue_usd  = serializers.DecimalField(max_digits=14, decimal_places=2)
    total_aircraft       = serializers.IntegerField()
    available_aircraft   = serializers.IntegerField()
    maintenance_alerts   = serializers.IntegerField()
    pending_requests     = serializers.IntegerField()
    total_crew           = serializers.IntegerField()
    available_crew       = serializers.IntegerField()
    unpaid_invoices      = serializers.IntegerField()


class PilotDashboardSerializer(serializers.Serializer):
    upcoming_flights  = FlightSerializer(many=True)
    completed_flights = serializers.IntegerField()
    total_hours       = serializers.DecimalField(max_digits=8, decimal_places=1)


class ClientDashboardSerializer(serializers.Serializer):
    upcoming_flights  = FlightSerializer(many=True)
    past_flights      = FlightSerializer(many=True)
    total_flights     = serializers.IntegerField()
    pending_requests  = serializers.IntegerField()