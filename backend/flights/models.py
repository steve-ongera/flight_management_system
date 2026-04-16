import uuid
from decimal import Decimal, ROUND_HALF_UP
from django.db import models
from django.contrib.auth.models import AbstractUser
from django.conf import settings
from django.utils import timezone


# ─────────────────────────────────────────────────────────────────
# CUSTOM USER
# ─────────────────────────────────────────────────────────────────
class User(AbstractUser):
    ROLE_CHOICES = [
        ('admin',  'Operations Admin'),
        ('ops',    'Ops Staff'),
        ('pilot',  'Pilot / Crew'),
        ('client', 'Charter Client'),
    ]
    role       = models.CharField(max_length=10, choices=ROLE_CHOICES, default='client')
    phone      = models.CharField(max_length=30, blank=True)
    company    = models.CharField(max_length=200, blank=True)
    avatar_url = models.URLField(blank=True)
    license_number = models.CharField(max_length=100, blank=True,
                                      help_text="Pilot licence number (pilots only)")
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.get_full_name() or self.username} ({self.role})"


# ─────────────────────────────────────────────────────────────────
# AIRPORT  (can sync with NairobiJetHouse catalogue)
# ─────────────────────────────────────────────────────────────────
class Airport(models.Model):
    code      = models.CharField(max_length=10, unique=True)
    name      = models.CharField(max_length=200)
    city      = models.CharField(max_length=100)
    country   = models.CharField(max_length=100)
    latitude  = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.code} – {self.city}, {self.country}"

    class Meta:
        ordering = ['code']


# ─────────────────────────────────────────────────────────────────
# AIRCRAFT FLEET
# ─────────────────────────────────────────────────────────────────
class Aircraft(models.Model):
    STATUS_CHOICES = [
        ('available',   'Available'),
        ('in_flight',   'In Flight'),
        ('maintenance', 'Under Maintenance'),
        ('grounded',    'Grounded'),
        ('inactive',    'Inactive'),
    ]
    CATEGORY_CHOICES = [
        ('light',         'Light Jet'),
        ('midsize',       'Midsize Jet'),
        ('super_midsize', 'Super Midsize Jet'),
        ('heavy',         'Heavy Jet'),
        ('ultra_long',    'Ultra Long Range'),
        ('vip_airliner',  'VIP Airliner'),
        ('turboprop',     'Turboprop'),
        ('helicopter',    'Helicopter'),
    ]

    reference            = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    tail_number          = models.CharField(max_length=20, unique=True)
    name                 = models.CharField(max_length=200)
    make                 = models.CharField(max_length=100, help_text="e.g. Gulfstream")
    model                = models.CharField(max_length=100, help_text="e.g. G650")
    category             = models.CharField(max_length=20, choices=CATEGORY_CHOICES)
    year_manufactured    = models.PositiveIntegerField(null=True, blank=True)
    passenger_capacity   = models.PositiveIntegerField()
    range_km             = models.PositiveIntegerField()
    cruise_speed_kmh     = models.PositiveIntegerField()
    max_altitude_ft      = models.PositiveIntegerField(null=True, blank=True)
    hourly_rate_usd      = models.DecimalField(max_digits=10, decimal_places=2)
    base_airport         = models.ForeignKey(Airport, on_delete=models.SET_NULL,
                                             null=True, blank=True,
                                             related_name='based_aircraft')
    status               = models.CharField(max_length=15, choices=STATUS_CHOICES, default='available')
    description          = models.TextField(blank=True)
    amenities            = models.JSONField(default=list, blank=True)
    image_url            = models.URLField(blank=True)

    # Maintenance tracking
    total_flight_hours         = models.DecimalField(max_digits=10, decimal_places=1, default=0)
    maintenance_interval_hours = models.IntegerField(default=200)
    last_maintenance_hours     = models.DecimalField(max_digits=10, decimal_places=1, default=0)
    last_maintenance_date      = models.DateField(null=True, blank=True)
    next_maintenance_date      = models.DateField(null=True, blank=True)

    # Documents
    insurance_expiry        = models.DateField(null=True, blank=True)
    airworthiness_expiry    = models.DateField(null=True, blank=True)
    registration_expiry     = models.DateField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    @property
    def hours_since_maintenance(self):
        return self.total_flight_hours - self.last_maintenance_hours

    @property
    def hours_until_maintenance(self):
        return self.maintenance_interval_hours - self.hours_since_maintenance

    @property
    def maintenance_due(self):
        return self.hours_until_maintenance <= 0

    def __str__(self):
        return f"{self.tail_number} – {self.name} ({self.make} {self.model})"

    class Meta:
        ordering = ['tail_number']


# ─────────────────────────────────────────────────────────────────
# CREW / PILOT
# ─────────────────────────────────────────────────────────────────
class CrewMember(models.Model):
    ROLE_CHOICES = [
        ('captain',    'Captain'),
        ('first_officer', 'First Officer'),
        ('cabin_crew', 'Cabin Crew'),
        ('engineer',   'Flight Engineer'),
    ]
    STATUS_CHOICES = [
        ('available', 'Available'),
        ('on_duty',   'On Duty'),
        ('on_leave',  'On Leave'),
        ('inactive',  'Inactive'),
    ]

    user             = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
                                            related_name='crew_profile',
                                            limit_choices_to={'role': 'pilot'})
    crew_role        = models.CharField(max_length=20, choices=ROLE_CHOICES, default='captain')
    license_number   = models.CharField(max_length=100)
    license_expiry   = models.DateField(null=True, blank=True)
    medical_expiry   = models.DateField(null=True, blank=True)
    type_ratings     = models.JSONField(default=list, help_text="List of aircraft types rated for")
    total_hours      = models.DecimalField(max_digits=8, decimal_places=1, default=0)
    status           = models.CharField(max_length=15, choices=STATUS_CHOICES, default='available')
    base_airport     = models.ForeignKey(Airport, on_delete=models.SET_NULL,
                                         null=True, blank=True)
    notes            = models.TextField(blank=True)
    created_at       = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user.get_full_name()} – {self.get_crew_role_display()}"


# ─────────────────────────────────────────────────────────────────
# CHARTER REQUEST  (public-facing inquiry)
# ─────────────────────────────────────────────────────────────────
class CharterRequest(models.Model):
    STATUS_CHOICES = [
        ('pending',   'Pending Review'),
        ('quoted',    'Quote Sent'),
        ('confirmed', 'Confirmed'),
        ('cancelled', 'Cancelled'),
    ]
    TRIP_TYPE_CHOICES = [
        ('one_way',    'One Way'),
        ('round_trip', 'Round Trip'),
        ('multi_leg',  'Multi-Leg'),
    ]

    reference       = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    client_name     = models.CharField(max_length=200)
    client_email    = models.EmailField()
    client_phone    = models.CharField(max_length=30, blank=True)
    company         = models.CharField(max_length=200, blank=True)
    trip_type       = models.CharField(max_length=20, choices=TRIP_TYPE_CHOICES, default='one_way')
    origin          = models.ForeignKey(Airport, on_delete=models.PROTECT,
                                        related_name='charter_departures')
    destination     = models.ForeignKey(Airport, on_delete=models.PROTECT,
                                        related_name='charter_arrivals')
    departure_date  = models.DateField()
    departure_time  = models.TimeField(null=True, blank=True)
    return_date     = models.DateField(null=True, blank=True)
    passenger_count = models.PositiveIntegerField()
    preferred_category = models.CharField(max_length=20, blank=True)
    special_requests   = models.TextField(blank=True)
    catering_requested = models.BooleanField(default=False)
    ground_transport   = models.BooleanField(default=False)
    status             = models.CharField(max_length=15, choices=STATUS_CHOICES, default='pending')
    created_at         = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Request {str(self.reference)[:8]} | {self.client_name} | {self.origin.code}→{self.destination.code}"


# ─────────────────────────────────────────────────────────────────
# FLIGHT  (operational record — created from a CharterRequest or directly)
# ─────────────────────────────────────────────────────────────────
class Flight(models.Model):
    STATUS_CHOICES = [
        ('scheduled',  'Scheduled'),
        ('boarding',   'Boarding'),
        ('departed',   'Departed'),
        ('in_flight',  'In Flight'),
        ('landed',     'Landed'),
        ('completed',  'Completed'),
        ('cancelled',  'Cancelled'),
        ('diverted',   'Diverted'),
        ('delayed',    'Delayed'),
    ]
    FLIGHT_TYPE_CHOICES = [
        ('charter',    'Charter'),
        ('private',    'Private'),
        ('cargo',      'Cargo'),
        ('positioning','Positioning / Ferry'),
        ('training',   'Training'),
    ]

    reference       = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    flight_number   = models.CharField(max_length=20, unique=True,
                                       help_text="e.g. PC-001")
    flight_type     = models.CharField(max_length=15, choices=FLIGHT_TYPE_CHOICES, default='charter')

    # Links
    charter_request = models.OneToOneField(CharterRequest, on_delete=models.SET_NULL,
                                            null=True, blank=True,
                                            related_name='flight')
    client          = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
                                         null=True, blank=True,
                                         related_name='flights',
                                         limit_choices_to={'role': 'client'})

    # Route
    origin          = models.ForeignKey(Airport, on_delete=models.PROTECT,
                                         related_name='flight_departures')
    destination     = models.ForeignKey(Airport, on_delete=models.PROTECT,
                                         related_name='flight_arrivals')
    departure_dt    = models.DateTimeField()
    arrival_dt      = models.DateTimeField(null=True, blank=True)
    actual_departure_dt = models.DateTimeField(null=True, blank=True)
    actual_arrival_dt   = models.DateTimeField(null=True, blank=True)

    # Aircraft & Crew
    aircraft        = models.ForeignKey(Aircraft, on_delete=models.PROTECT,
                                         related_name='flights')
    captain         = models.ForeignKey(CrewMember, on_delete=models.SET_NULL,
                                         null=True, blank=True,
                                         related_name='captain_flights')
    first_officer   = models.ForeignKey(CrewMember, on_delete=models.SET_NULL,
                                         null=True, blank=True,
                                         related_name='fo_flights')

    # Passengers
    passenger_count = models.PositiveIntegerField(default=1)
    manifest        = models.JSONField(default=list, blank=True,
                                       help_text="List of passenger dicts")

    # Operations
    flight_plan_number = models.CharField(max_length=50, blank=True)
    estimated_hours    = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    actual_hours       = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    fuel_uplift_kg     = models.DecimalField(max_digits=8, decimal_places=1, null=True, blank=True)
    notes              = models.TextField(blank=True)
    status             = models.CharField(max_length=15, choices=STATUS_CHOICES, default='scheduled')

    # Pricing
    quoted_price_usd   = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    commission_pct     = models.DecimalField(max_digits=5, decimal_places=2, default=10)
    commission_usd     = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    net_revenue_usd    = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    is_invoiced        = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        if self.quoted_price_usd is not None:
            pct = Decimal(str(self.commission_pct or 10))
            price = Decimal(str(self.quoted_price_usd))
            self.commission_usd  = (price * pct / 100).quantize(Decimal('0.01'), ROUND_HALF_UP)
            self.net_revenue_usd = (price - self.commission_usd).quantize(Decimal('0.01'), ROUND_HALF_UP)
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.flight_number} | {self.origin.code}→{self.destination.code} | {self.departure_dt.date()}"

    class Meta:
        ordering = ['-departure_dt']


# ─────────────────────────────────────────────────────────────────
# FLIGHT LEG  (for multi-leg flights)
# ─────────────────────────────────────────────────────────────────
class FlightLeg(models.Model):
    flight       = models.ForeignKey(Flight, on_delete=models.CASCADE, related_name='legs')
    leg_number   = models.PositiveIntegerField()
    origin       = models.ForeignKey(Airport, on_delete=models.PROTECT,
                                     related_name='leg_origins')
    destination  = models.ForeignKey(Airport, on_delete=models.PROTECT,
                                     related_name='leg_destinations')
    departure_dt = models.DateTimeField()
    arrival_dt   = models.DateTimeField(null=True, blank=True)
    status       = models.CharField(max_length=15, default='scheduled')
    notes        = models.TextField(blank=True)

    class Meta:
        ordering = ['leg_number']

    def __str__(self):
        return f"{self.flight.flight_number} Leg {self.leg_number}"


# ─────────────────────────────────────────────────────────────────
# MAINTENANCE LOG
# ─────────────────────────────────────────────────────────────────
class MaintenanceLog(models.Model):
    TYPE_CHOICES = [
        ('routine',    'Routine Service'),
        ('repair',     'Repair'),
        ('inspection', 'Inspection / Check'),
        ('upgrade',    'Upgrade / Modification'),
        ('emergency',  'AOG / Emergency'),
        ('annual',     'Annual Airworthiness'),
    ]
    STATUS_CHOICES = [
        ('scheduled',   'Scheduled'),
        ('in_progress', 'In Progress'),
        ('completed',   'Completed'),
        ('cancelled',   'Cancelled'),
    ]

    aircraft         = models.ForeignKey(Aircraft, on_delete=models.CASCADE,
                                          related_name='maintenance_logs')
    maintenance_type = models.CharField(max_length=15, choices=TYPE_CHOICES)
    status           = models.CharField(max_length=15, choices=STATUS_CHOICES, default='scheduled')
    scheduled_date   = models.DateField()
    completed_date   = models.DateField(null=True, blank=True)
    flight_hours_at  = models.DecimalField(max_digits=10, decimal_places=1, default=0)
    description      = models.TextField()
    technician       = models.CharField(max_length=200, blank=True)
    facility         = models.CharField(max_length=200, blank=True)
    cost_usd         = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    notes            = models.TextField(blank=True)
    created_at       = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.aircraft.tail_number} – {self.get_maintenance_type_display()} on {self.scheduled_date}"

    class Meta:
        ordering = ['-scheduled_date']


# ─────────────────────────────────────────────────────────────────
# INVOICE
# ─────────────────────────────────────────────────────────────────
class Invoice(models.Model):
    STATUS_CHOICES = [
        ('draft',     'Draft'),
        ('sent',      'Sent'),
        ('paid',      'Paid'),
        ('overdue',   'Overdue'),
        ('cancelled', 'Cancelled'),
    ]

    reference    = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    invoice_number = models.CharField(max_length=30, unique=True)
    flight       = models.OneToOneField(Flight, on_delete=models.PROTECT,
                                        related_name='invoice')
    client_name  = models.CharField(max_length=200)
    client_email = models.EmailField()
    amount_usd   = models.DecimalField(max_digits=12, decimal_places=2)
    tax_pct      = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    tax_usd      = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total_usd    = models.DecimalField(max_digits=12, decimal_places=2)
    due_date     = models.DateField()
    paid_date    = models.DateField(null=True, blank=True)
    status       = models.CharField(max_length=15, choices=STATUS_CHOICES, default='draft')
    notes        = models.TextField(blank=True)
    created_at   = models.DateTimeField(auto_now_add=True)
    created_by   = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
                                      null=True, blank=True)

    def __str__(self):
        return f"INV-{self.invoice_number} | {self.client_name} | ${self.total_usd}"

    class Meta:
        ordering = ['-created_at']


# ─────────────────────────────────────────────────────────────────
# EMAIL LOG
# ─────────────────────────────────────────────────────────────────
class EmailLog(models.Model):
    reference    = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    sent_by      = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
                                      null=True, related_name='sent_emails')
    to_email     = models.EmailField()
    to_name      = models.CharField(max_length=200, blank=True)
    subject      = models.CharField(max_length=500)
    body         = models.TextField()
    email_type   = models.CharField(max_length=30, default='general')
    related_id   = models.IntegerField(null=True, blank=True)
    sent_at      = models.DateTimeField(auto_now_add=True)
    success      = models.BooleanField(default=True)
    error_msg    = models.TextField(blank=True)

    class Meta:
        ordering = ['-sent_at']

    def __str__(self):
        return f"Email to {self.to_email} [{self.sent_at:%Y-%m-%d}]"


# ─────────────────────────────────────────────────────────────────
# NOTIFICATION
# ─────────────────────────────────────────────────────────────────
class Notification(models.Model):
    TYPE_CHOICES = [
        ('info',    'Information'),
        ('warning', 'Warning'),
        ('alert',   'Alert'),
        ('success', 'Success'),
    ]
    user      = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
                                   related_name='notifications')
    title     = models.CharField(max_length=200)
    message   = models.TextField()
    notif_type = models.CharField(max_length=10, choices=TYPE_CHOICES, default='info')
    is_read   = models.BooleanField(default=False)
    link      = models.CharField(max_length=300, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user.username} – {self.title}"