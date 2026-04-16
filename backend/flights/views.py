from rest_framework import viewsets, status, permissions, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate
from django.db.models import Sum, Count, Q, Avg
from django.db.models.functions import TruncMonth
from django.utils import timezone
from django.core.mail import EmailMultiAlternatives
from django.conf import settings as django_settings
from datetime import timedelta
from decimal import Decimal, ROUND_HALF_UP

from .models import (
    User, Airport, Aircraft, CrewMember,
    CharterRequest, Flight, FlightLeg,
    MaintenanceLog, Invoice, EmailLog, Notification,
)
from .serializers import (
    UserRegistrationSerializer, UserProfileSerializer, UserAdminSerializer,
    AirportSerializer, AircraftSerializer, AircraftListSerializer,
    CrewMemberSerializer, CharterRequestSerializer,
    FlightSerializer, FlightCreateSerializer, FlightPriceSerializer, FlightStatusSerializer,
    FlightLegSerializer, MaintenanceLogSerializer,
    InvoiceSerializer, InvoiceCreateSerializer,
    EmailLogSerializer, SendEmailSerializer,
    NotificationSerializer, PriceCalculatorSerializer,
)


# ─────────────────────────────────────────────────────────────────
# PERMISSIONS
# ─────────────────────────────────────────────────────────────────
class IsAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'admin'

class IsAdminOrOps(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in ['admin', 'ops']

class IsPilot(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'pilot'

class IsClient(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'client'

class IsAdminOpsOrPilot(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in ['admin', 'ops', 'pilot']


# ─────────────────────────────────────────────────────────────────
# SHARED EMAIL HELPER
# ─────────────────────────────────────────────────────────────────
def _send_email_and_log(sent_by, to_email, to_name, subject, body,
                         email_type='general', related_id=None):
    html = f"""
    <html><body style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:auto;padding:20px;background:#f8fafc">
      <div style="background:#0c1f3f;padding:28px 32px;border-radius:12px 12px 0 0">
        <div style="display:flex;align-items:center;gap:12px">
          <div style="width:40px;height:40px;background:#e8a020;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:20px">✈</div>
          <div>
            <h2 style="color:#ffffff;margin:0;font-size:18px;font-weight:800;letter-spacing:-0.3px">Paramount Charters</h2>
            <p style="color:rgba(255,255,255,0.5);margin:2px 0 0;font-size:12px">Private Aviation Excellence</p>
          </div>
        </div>
      </div>
      <div style="background:#ffffff;border:1px solid #e5e7eb;border-top:none;padding:32px;border-radius:0 0 12px 12px">
        {"<p style='color:#374151;font-size:15px;margin-bottom:16px'>Dear <strong>" + to_name + "</strong>,</p>" if to_name else ""}
        <div style="color:#4b5563;line-height:1.8;font-size:14px;white-space:pre-line">{body}</div>
        <hr style="border:none;border-top:1px solid #f3f4f6;margin:28px 0">
        <p style="color:#9ca3af;font-size:12px;margin:0;line-height:1.6">
          <strong style="color:#6b7280">Paramount Charters</strong> · Private Aviation & Charter Services<br>
          Nairobi, Kenya · +254 700 000 000 · ops@paramountcharters.co.ke
        </p>
      </div>
    </body></html>
    """
    try:
        msg = EmailMultiAlternatives(
            subject=subject,
            body=body,
            from_email=getattr(django_settings, 'DEFAULT_FROM_EMAIL', 'ops@paramountcharters.co.ke'),
            to=[f'"{to_name}" <{to_email}>' if to_name else to_email],
        )
        msg.attach_alternative(html, "text/html")
        msg.send()
        EmailLog.objects.create(
            sent_by=sent_by, to_email=to_email, to_name=to_name,
            subject=subject, body=body, email_type=email_type,
            related_id=related_id, success=True,
        )
        return True, ''
    except Exception as e:
        EmailLog.objects.create(
            sent_by=sent_by, to_email=to_email, to_name=to_name,
            subject=subject, body=body, email_type=email_type,
            related_id=related_id, success=False, error_msg=str(e),
        )
        return False, str(e)


# ─────────────────────────────────────────────────────────────────
# AUTH
# ─────────────────────────────────────────────────────────────────
class AuthViewSet(viewsets.ViewSet):
    permission_classes = [permissions.AllowAny]

    @action(detail=False, methods=['post'])
    def register(self, request):
        ser = UserRegistrationSerializer(data=request.data)
        if ser.is_valid():
            user = ser.save()
            refresh = RefreshToken.for_user(user)
            return Response({
                'message': 'Registration successful.',
                'user': UserProfileSerializer(user).data,
                'tokens': {'refresh': str(refresh), 'access': str(refresh.access_token)},
            }, status=201)
        return Response(ser.errors, status=400)

    @action(detail=False, methods=['post'])
    def login(self, request):
        username = request.data.get('username')
        password = request.data.get('password')
        user = authenticate(username=username, password=password)
        if not user:
            return Response({'error': 'Invalid credentials.'}, status=401)
        if not user.is_active:
            return Response({'error': 'Account is disabled.'}, status=403)
        refresh = RefreshToken.for_user(user)
        return Response({
            'user': UserProfileSerializer(user).data,
            'tokens': {'refresh': str(refresh), 'access': str(refresh.access_token)},
        })

    @action(detail=False, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def me(self, request):
        return Response(UserProfileSerializer(request.user).data)

    @action(detail=False, methods=['patch'], permission_classes=[permissions.IsAuthenticated])
    def update_profile(self, request):
        ser = UserProfileSerializer(request.user, data=request.data, partial=True)
        if ser.is_valid():
            ser.save()
            return Response(ser.data)
        return Response(ser.errors, status=400)

    @action(detail=False, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def logout(self, request):
        try:
            RefreshToken(request.data.get('refresh')).blacklist()
        except Exception:
            pass
        return Response({'message': 'Logged out successfully.'})

    @action(detail=False, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def change_password(self, request):
        user = request.user
        old_pw = request.data.get('old_password')
        new_pw = request.data.get('new_password')
        if not user.check_password(old_pw):
            return Response({'error': 'Incorrect current password.'}, status=400)
        user.set_password(new_pw)
        user.save()
        return Response({'message': 'Password updated.'})


# ─────────────────────────────────────────────────────────────────
# AIRPORTS
# ─────────────────────────────────────────────────────────────────
class AirportViewSet(viewsets.ModelViewSet):
    queryset = Airport.objects.filter(is_active=True).order_by('code')
    serializer_class = AirportSerializer
    filter_backends  = [filters.SearchFilter]
    search_fields    = ['code', 'name', 'city', 'country']

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [permissions.IsAuthenticated()]
        return [IsAdminOrOps()]


# ─────────────────────────────────────────────────────────────────
# AIRCRAFT
# ─────────────────────────────────────────────────────────────────
class AircraftViewSet(viewsets.ModelViewSet):
    filter_backends = [filters.SearchFilter]
    search_fields   = ['tail_number', 'name', 'make', 'model', 'category']

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [permissions.IsAuthenticated()]
        return [IsAdminOrOps()]

    def get_queryset(self):
        qs = Aircraft.objects.select_related('base_airport').all()
        status_filter = self.request.query_params.get('status')
        if status_filter:
            qs = qs.filter(status=status_filter)
        return qs.order_by('tail_number')

    def get_serializer_class(self):
        if self.action == 'list':
            return AircraftListSerializer
        return AircraftSerializer

    @action(detail=True, methods=['post'], permission_classes=[IsAdminOrOps])
    def update_status(self, request, pk=None):
        aircraft = self.get_object()
        new_status = request.data.get('status')
        valid = [s[0] for s in Aircraft.STATUS_CHOICES]
        if new_status not in valid:
            return Response({'error': 'Invalid status.'}, status=400)
        aircraft.status = new_status
        aircraft.save()
        return Response({'message': f'Status updated to {new_status}.'})

    @action(detail=True, methods=['post'], permission_classes=[IsAdminOrOps])
    def log_hours(self, request, pk=None):
        aircraft = self.get_object()
        hours = Decimal(str(request.data.get('hours', 0)))
        aircraft.total_flight_hours += hours
        aircraft.save()
        return Response({
            'total_flight_hours':     float(aircraft.total_flight_hours),
            'hours_until_maintenance': float(aircraft.hours_until_maintenance),
            'maintenance_due':         aircraft.maintenance_due,
        })


# ─────────────────────────────────────────────────────────────────
# CREW
# ─────────────────────────────────────────────────────────────────
class CrewMemberViewSet(viewsets.ModelViewSet):
    serializer_class = CrewMemberSerializer
    filter_backends  = [filters.SearchFilter]
    search_fields    = ['user__first_name', 'user__last_name', 'license_number', 'crew_role']

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [IsAdminOpsOrPilot()]
        return [IsAdminOrOps()]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'pilot':
            return CrewMember.objects.filter(user=user)
        return CrewMember.objects.select_related('user', 'base_airport').all()

    @action(detail=False, methods=['get'], permission_classes=[IsAdminOrOps])
    def available(self, request):
        crew = CrewMember.objects.filter(status='available').select_related('user')
        return Response(CrewMemberSerializer(crew, many=True).data)


# ─────────────────────────────────────────────────────────────────
# CHARTER REQUESTS  (public-facing)
# ─────────────────────────────────────────────────────────────────
class CharterRequestViewSet(viewsets.ModelViewSet):
    serializer_class = CharterRequestSerializer
    filter_backends  = [filters.SearchFilter]
    search_fields    = ['client_name', 'client_email', 'reference']

    def get_permissions(self):
        if self.action == 'create':
            return [permissions.AllowAny()]
        if self.action in ['list', 'retrieve', 'update_status']:
            return [IsAdminOrOps()]
        return [IsAdminOrOps()]

    def get_queryset(self):
        qs = CharterRequest.objects.select_related('origin', 'destination').order_by('-created_at')
        status_f = self.request.query_params.get('status')
        if status_f:
            qs = qs.filter(status=status_f)
        return qs

    def create(self, request, *args, **kwargs):
        ser = self.get_serializer(data=request.data)
        ser.is_valid(raise_exception=True)
        req = ser.save()
        return Response({
            'message': 'Your charter request has been received. Our team will contact you within 2 hours.',
            'reference': str(req.reference),
            'request': CharterRequestSerializer(req).data,
        }, status=201)

    @action(detail=False, methods=['get'], permission_classes=[permissions.AllowAny],
            url_path='track/(?P<reference>[^/.]+)')
    def track(self, request, reference=None):
        try:
            req = CharterRequest.objects.get(reference=reference)
            return Response(CharterRequestSerializer(req).data)
        except CharterRequest.DoesNotExist:
            return Response({'error': 'Request not found.'}, status=404)

    @action(detail=True, methods=['patch'], permission_classes=[IsAdminOrOps])
    def update_status(self, request, pk=None):
        req = self.get_object()
        new_status = request.data.get('status')
        req.status = new_status
        req.save()
        return Response({'message': f'Status updated to {new_status}.'})

    @action(detail=True, methods=['post'], permission_classes=[IsAdminOrOps])
    def convert_to_flight(self, request, pk=None):
        """Convert a confirmed request into an operational flight record."""
        req = self.get_object()
        if hasattr(req, 'flight'):
            return Response({'error': 'Flight already created for this request.'}, status=400)

        import random
        flight_number = f"PC-{random.randint(1000, 9999)}"
        while Flight.objects.filter(flight_number=flight_number).exists():
            flight_number = f"PC-{random.randint(1000, 9999)}"

        from datetime import datetime
        dep_dt = datetime.combine(req.departure_date,
                                   req.departure_time or datetime.min.time())
        dep_dt = timezone.make_aware(dep_dt)

        flight = Flight.objects.create(
            flight_number=flight_number,
            charter_request=req,
            origin=req.origin,
            destination=req.destination,
            departure_dt=dep_dt,
            passenger_count=req.passenger_count,
            aircraft_id=request.data.get('aircraft_id'),
            status='scheduled',
        )
        req.status = 'confirmed'
        req.save()
        return Response({
            'message': 'Flight created successfully.',
            'flight': FlightSerializer(flight).data,
        }, status=201)


# ─────────────────────────────────────────────────────────────────
# FLIGHTS
# ─────────────────────────────────────────────────────────────────
class FlightViewSet(viewsets.ModelViewSet):
    filter_backends = [filters.SearchFilter]
    search_fields   = ['flight_number', 'origin__code', 'destination__code',
                       'aircraft__tail_number', 'reference']

    def get_permissions(self):
        if self.action == 'create':
            return [IsAdminOrOps()]
        if self.action in ['list', 'retrieve', 'my_flights']:
            return [permissions.IsAuthenticated()]
        return [IsAdminOrOps()]

    def get_queryset(self):
        user = self.request.user
        qs = Flight.objects.select_related(
            'origin', 'destination', 'aircraft', 'captain__user',
            'first_officer__user', 'client'
        ).prefetch_related('legs')

        if user.role == 'client':
            qs = qs.filter(client=user)
        elif user.role == 'pilot':
            try:
                crew = user.crew_profile
                qs = qs.filter(Q(captain=crew) | Q(first_officer=crew))
            except Exception:
                qs = qs.none()

        # Filters
        status_f = self.request.query_params.get('status')
        if status_f:
            qs = qs.filter(status=status_f)

        date_from = self.request.query_params.get('date_from')
        if date_from:
            qs = qs.filter(departure_dt__date__gte=date_from)

        date_to = self.request.query_params.get('date_to')
        if date_to:
            qs = qs.filter(departure_dt__date__lte=date_to)

        return qs.order_by('-departure_dt')

    def get_serializer_class(self):
        if self.action == 'create':
            return FlightCreateSerializer
        return FlightSerializer

    @action(detail=False, methods=['get'])
    def upcoming(self, request):
        qs = self.get_queryset().filter(
            departure_dt__gte=timezone.now(),
            status__in=['scheduled', 'boarding', 'delayed']
        ).order_by('departure_dt')[:20]
        return Response(FlightSerializer(qs, many=True).data)

    @action(detail=False, methods=['get'])
    def today(self, request):
        today = timezone.now().date()
        qs = self.get_queryset().filter(departure_dt__date=today)
        return Response(FlightSerializer(qs, many=True).data)

    @action(detail=True, methods=['post'], permission_classes=[IsAdminOrOps])
    def set_price(self, request, pk=None):
        flight = self.get_object()
        ser = FlightPriceSerializer(data=request.data)
        if not ser.is_valid():
            return Response(ser.errors, status=400)
        d = ser.validated_data
        flight.quoted_price_usd = d['quoted_price_usd']
        if d.get('commission_pct') is not None:
            flight.commission_pct = d['commission_pct']
        if d.get('status'):
            flight.status = d['status']
        flight.save()

        result = {
            'message':        'Price updated.',
            'quoted_price':   float(flight.quoted_price_usd),
            'commission_usd': float(flight.commission_usd or 0),
            'net_revenue':    float(flight.net_revenue_usd or 0),
            'email_sent':     False,
        }

        if d.get('send_email', True) and flight.client:
            email = flight.client.email
            name  = flight.client.get_full_name()
            route = f"{flight.origin.code} → {flight.destination.code}"
            body  = d.get('email_message') or (
                f"Dear {name},\n\n"
                f"Thank you for choosing Paramount Charters.\n\n"
                f"Your flight quote:\n\n"
                f"  Flight:      {flight.flight_number}\n"
                f"  Route:       {route}\n"
                f"  Departure:   {flight.departure_dt.strftime('%d %B %Y, %H:%M')}\n"
                f"  Passengers:  {flight.passenger_count}\n\n"
                f"  Quoted Price: USD ${float(flight.quoted_price_usd):,.2f}\n\n"
                f"To confirm, please contact our operations team.\n\n"
                f"Warm regards,\nParamount Charters Operations"
            )
            ok, err = _send_email_and_log(
                request.user, email, name,
                f"Your Flight Quote – {route} | Paramount Charters",
                body, 'flight', flight.id,
            )
            result['email_sent'] = ok

        return Response(result)

    @action(detail=True, methods=['patch'], permission_classes=[IsAdminOpsOrPilot])
    def update_status(self, request, pk=None):
        flight = self.get_object()
        ser = FlightStatusSerializer(data=request.data)
        if not ser.is_valid():
            return Response(ser.errors, status=400)
        d = ser.validated_data

        flight.status = d['status']
        if d.get('actual_departure_dt'):
            flight.actual_departure_dt = d['actual_departure_dt']
        if d.get('actual_arrival_dt'):
            flight.actual_arrival_dt = d['actual_arrival_dt']
        if d.get('actual_hours'):
            flight.actual_hours = d['actual_hours']
            # Log flight hours on aircraft
            flight.aircraft.total_flight_hours += d['actual_hours']
            flight.aircraft.save()
            # Log hours on crew
            if flight.captain:
                flight.captain.total_hours += d['actual_hours']
                flight.captain.save()
            if flight.first_officer:
                flight.first_officer.total_hours += d['actual_hours']
                flight.first_officer.save()
        if d.get('notes'):
            flight.notes = d['notes']

        if d['status'] == 'completed':
            flight.is_invoiced = False

        flight.save()
        return Response({'message': f'Flight status updated to {d["status"]}.'})

    @action(detail=True, methods=['post'], permission_classes=[IsAdminOrOps])
    def assign_crew(self, request, pk=None):
        flight = self.get_object()
        captain_id = request.data.get('captain_id')
        fo_id      = request.data.get('first_officer_id')
        if captain_id:
            flight.captain_id = captain_id
        if fo_id:
            flight.first_officer_id = fo_id
        flight.save()
        return Response({'message': 'Crew assigned.', 'flight': FlightSerializer(flight).data})

    @action(detail=True, methods=['post'], permission_classes=[IsAdminOrOps])
    def reply(self, request, pk=None):
        flight = self.get_object()
        subject = request.data.get('subject', '')
        message = request.data.get('message', '')
        if not flight.client:
            return Response({'error': 'No client linked to this flight.'}, status=400)
        ok, err = _send_email_and_log(
            request.user, flight.client.email, flight.client.get_full_name(),
            subject, message, 'flight', flight.id,
        )
        if ok:
            return Response({'message': 'Email sent.'})
        return Response({'error': err}, status=500)


# ─────────────────────────────────────────────────────────────────
# MAINTENANCE
# ─────────────────────────────────────────────────────────────────
class MaintenanceLogViewSet(viewsets.ModelViewSet):
    serializer_class = MaintenanceLogSerializer
    permission_classes = [IsAdminOpsOrPilot]
    filter_backends  = [filters.SearchFilter]
    search_fields    = ['aircraft__tail_number', 'aircraft__name', 'maintenance_type']

    def get_queryset(self):
        qs = MaintenanceLog.objects.select_related('aircraft')
        aircraft_id = self.request.query_params.get('aircraft')
        if aircraft_id:
            qs = qs.filter(aircraft_id=aircraft_id)
        return qs.order_by('-scheduled_date')

    @action(detail=False, methods=['get'])
    def alerts(self, request):
        """Aircraft where maintenance is overdue or within 10 hours."""
        aircraft = Aircraft.objects.all()
        alerts = [a for a in aircraft if a.hours_until_maintenance <= 10]
        return Response(AircraftListSerializer(alerts, many=True).data)

    @action(detail=False, methods=['get'])
    def upcoming(self, request):
        """Scheduled maintenance in next 30 days."""
        next_30 = timezone.now().date() + timedelta(days=30)
        logs = MaintenanceLog.objects.filter(
            status='scheduled', scheduled_date__lte=next_30
        ).select_related('aircraft').order_by('scheduled_date')
        return Response(MaintenanceLogSerializer(logs, many=True).data)


# ─────────────────────────────────────────────────────────────────
# INVOICES
# ─────────────────────────────────────────────────────────────────
class InvoiceViewSet(viewsets.ModelViewSet):
    filter_backends = [filters.SearchFilter]
    search_fields   = ['invoice_number', 'client_name', 'client_email']

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [permissions.IsAuthenticated()]
        return [IsAdminOrOps()]

    def get_queryset(self):
        user = self.request.user
        qs = Invoice.objects.select_related('flight', 'flight__origin', 'flight__destination')
        if user.role == 'client':
            qs = qs.filter(client_email=user.email)
        status_f = self.request.query_params.get('status')
        if status_f:
            qs = qs.filter(status=status_f)
        return qs.order_by('-created_at')

    def get_serializer_class(self):
        if self.action == 'create':
            return InvoiceCreateSerializer
        return InvoiceSerializer

    @action(detail=True, methods=['post'], permission_classes=[IsAdminOrOps])
    def mark_paid(self, request, pk=None):
        invoice = self.get_object()
        invoice.status    = 'paid'
        invoice.paid_date = timezone.now().date()
        invoice.save()
        invoice.flight.is_invoiced = True
        invoice.flight.save()
        return Response({'message': 'Invoice marked as paid.'})

    @action(detail=True, methods=['post'], permission_classes=[IsAdminOrOps])
    def send_to_client(self, request, pk=None):
        invoice = self.get_object()
        body = (
            f"Dear {invoice.client_name},\n\n"
            f"Please find attached your invoice from Paramount Charters.\n\n"
            f"Invoice Number: {invoice.invoice_number}\n"
            f"Flight: {invoice.flight.flight_number}\n"
            f"Route: {invoice.flight.origin.code} → {invoice.flight.destination.code}\n"
            f"Amount Due: USD ${invoice.total_usd:,.2f}\n"
            f"Due Date: {invoice.due_date}\n\n"
            f"Warm regards,\nParamount Charters Finance Team"
        )
        ok, err = _send_email_and_log(
            request.user, invoice.client_email, invoice.client_name,
            f"Invoice {invoice.invoice_number} | Paramount Charters",
            body, 'invoice', invoice.id,
        )
        if ok:
            invoice.status = 'sent'
            invoice.save()
            return Response({'message': 'Invoice sent to client.'})
        return Response({'error': err}, status=500)


# ─────────────────────────────────────────────────────────────────
# EMAIL LOG
# ─────────────────────────────────────────────────────────────────
class EmailLogViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsAdminOrOps]
    serializer_class   = EmailLogSerializer
    filter_backends    = [filters.SearchFilter]
    search_fields      = ['to_email', 'subject', 'email_type']

    def get_queryset(self):
        return EmailLog.objects.select_related('sent_by').order_by('-sent_at')

    @action(detail=False, methods=['post'])
    def send(self, request):
        ser = SendEmailSerializer(data=request.data)
        if not ser.is_valid():
            return Response(ser.errors, status=400)
        d = ser.validated_data
        ok, err = _send_email_and_log(
            request.user, d['to_email'], d.get('to_name', ''),
            d['subject'], d['body'], d.get('email_type', 'general'),
            d.get('related_id'),
        )
        if ok:
            return Response({'message': f'Email sent to {d["to_email"]}.'})
        return Response({'error': err}, status=500)


# ─────────────────────────────────────────────────────────────────
# NOTIFICATIONS
# ─────────────────────────────────────────────────────────────────
class NotificationViewSet(viewsets.ModelViewSet):
    serializer_class   = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Notification.objects.filter(user=self.request.user)

    @action(detail=False, methods=['post'])
    def mark_all_read(self, request):
        self.get_queryset().update(is_read=True)
        return Response({'message': 'All notifications marked as read.'})

    @action(detail=True, methods=['post'])
    def mark_read(self, request, pk=None):
        notif = self.get_object()
        notif.is_read = True
        notif.save()
        return Response({'message': 'Notification marked as read.'})

    @action(detail=False, methods=['get'])
    def unread_count(self, request):
        count = self.get_queryset().filter(is_read=False).count()
        return Response({'unread_count': count})


# ─────────────────────────────────────────────────────────────────
# PRICE CALCULATOR
# ─────────────────────────────────────────────────────────────────
class PriceCalculatorViewSet(viewsets.ViewSet):
    permission_classes = [IsAdminOrOps]

    @action(detail=False, methods=['post'])
    def calculate(self, request):
        ser = PriceCalculatorSerializer(data=request.data)
        if not ser.is_valid():
            return Response(ser.errors, status=400)
        d = ser.validated_data

        hourly = d.get('hourly_rate_usd')
        if not hourly and d.get('aircraft_id'):
            try:
                hourly = Aircraft.objects.get(id=d['aircraft_id']).hourly_rate_usd
            except Aircraft.DoesNotExist:
                pass
        if not hourly:
            return Response({'error': 'Provide aircraft_id or hourly_rate_usd.'}, status=400)

        hours     = Decimal(str(d['estimated_hours']))
        base      = hourly * hours
        catering  = Decimal('600') * d['passenger_count'] if d['catering'] else Decimal('0')
        ground    = Decimal('900') if d['ground_transport'] else Decimal('0')
        concierge = Decimal('500') if d['concierge'] else Decimal('0')
        subtotal  = base + catering + ground + concierge
        discount  = (subtotal * Decimal(str(d['discount_pct'])) / 100).quantize(Decimal('0.01'), ROUND_HALF_UP)
        after     = subtotal - discount
        comm      = (after * Decimal(str(d['commission_pct'])) / 100).quantize(Decimal('0.01'), ROUND_HALF_UP)
        net       = after - comm

        return Response({'breakdown': {
            'hourly_rate_usd':   float(hourly),
            'estimated_hours':   float(hours),
            'base_flight_cost':  float(base),
            'catering_cost':     float(catering),
            'ground_transport':  float(ground),
            'concierge_cost':    float(concierge),
            'subtotal':          float(subtotal),
            'discount_pct':      float(d['discount_pct']),
            'discount_amount':   float(discount),
            'after_discount':    float(after),
            'commission_pct':    float(d['commission_pct']),
            'commission_amount': float(comm),
            'net_revenue_usd':   float(net),
            'grand_total_usd':   float(after),
        }})


# ─────────────────────────────────────────────────────────────────
# USER MANAGEMENT (ADMIN)
# ─────────────────────────────────────────────────────────────────
class UserAdminViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAdmin]
    serializer_class   = UserAdminSerializer
    filter_backends    = [filters.SearchFilter]
    search_fields      = ['username', 'email', 'first_name', 'last_name', 'company']

    def get_queryset(self):
        qs = User.objects.order_by('-created_at')
        role = self.request.query_params.get('role')
        if role:
            qs = qs.filter(role=role)
        return qs

    @action(detail=True, methods=['post'])
    def toggle_active(self, request, pk=None):
        user = self.get_object()
        user.is_active = not user.is_active
        user.save()
        return Response({'message': 'activated' if user.is_active else 'deactivated',
                         'is_active': user.is_active})


# ─────────────────────────────────────────────────────────────────
# DASHBOARDS
# ─────────────────────────────────────────────────────────────────
class DashboardViewSet(viewsets.ViewSet):
    permission_classes = [permissions.IsAuthenticated]

    @action(detail=False, methods=['get'])
    def admin(self, request):
        if request.user.role not in ['admin', 'ops']:
            return Response({'error': 'Forbidden.'}, status=403)

        now = timezone.now()
        month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

        flights    = Flight.objects.all()
        revenue_qs = flights.filter(
            status__in=['completed', 'in_flight'],
            quoted_price_usd__isnull=False
        )

        return Response({
            'total_flights':      flights.count(),
            'scheduled_flights':  flights.filter(status__in=['scheduled', 'boarding', 'delayed']).count(),
            'completed_flights':  flights.filter(status='completed').count(),
            'today_flights':      flights.filter(departure_dt__date=now.date()).count(),
            'total_revenue_usd':  float(revenue_qs.aggregate(t=Sum('quoted_price_usd'))['t'] or 0),
            'monthly_revenue_usd': float(
                revenue_qs.filter(departure_dt__gte=month_start)
                .aggregate(t=Sum('quoted_price_usd'))['t'] or 0
            ),
            'total_commission_usd': float(revenue_qs.aggregate(t=Sum('commission_usd'))['t'] or 0),
            'total_aircraft':     Aircraft.objects.count(),
            'available_aircraft': Aircraft.objects.filter(status='available').count(),
            'maintenance_alerts': len([a for a in Aircraft.objects.all() if a.hours_until_maintenance <= 10]),
            'pending_requests':   CharterRequest.objects.filter(status='pending').count(),
            'total_crew':         CrewMember.objects.count(),
            'available_crew':     CrewMember.objects.filter(status='available').count(),
            'unpaid_invoices':    Invoice.objects.filter(status__in=['sent', 'overdue']).count(),
        })

    @action(detail=False, methods=['get'])
    def revenue_chart(self, request):
        if request.user.role not in ['admin', 'ops']:
            return Response({'error': 'Forbidden.'}, status=403)
        months = int(request.query_params.get('months', 12))
        since  = timezone.now() - timedelta(days=months * 31)
        qs = (
            Flight.objects
            .filter(status__in=['completed', 'in_flight'],
                    quoted_price_usd__isnull=False,
                    departure_dt__gte=since)
            .annotate(month=TruncMonth('departure_dt'))
            .values('month')
            .annotate(
                count=Count('id'),
                gross=Sum('quoted_price_usd'),
                commission=Sum('commission_usd'),
                net=Sum('net_revenue_usd'),
            )
            .order_by('month')
        )
        return Response({
            'chart': [{
                'month':      row['month'].strftime('%Y-%m'),
                'label':      row['month'].strftime('%b %Y'),
                'count':      row['count'],
                'gross_usd':  float(row['gross'] or 0),
                'commission': float(row['commission'] or 0),
                'net_usd':    float(row['net'] or 0),
            } for row in qs]
        })

    @action(detail=False, methods=['get'])
    def fleet_status(self, request):
        if request.user.role not in ['admin', 'ops']:
            return Response({'error': 'Forbidden.'}, status=403)
        statuses = Aircraft.objects.values('status').annotate(count=Count('id'))
        return Response({'fleet': list(statuses)})

    @action(detail=False, methods=['get'])
    def pilot(self, request):
        if request.user.role != 'pilot':
            return Response({'error': 'Forbidden.'}, status=403)
        try:
            crew = request.user.crew_profile
        except Exception:
            return Response({'error': 'Crew profile not found.'}, status=404)

        upcoming = Flight.objects.filter(
            Q(captain=crew) | Q(first_officer=crew),
            departure_dt__gte=timezone.now(),
            status__in=['scheduled', 'boarding', 'delayed']
        ).order_by('departure_dt')[:10]

        return Response({
            'upcoming_flights': FlightSerializer(upcoming, many=True).data,
            'completed_flights': Flight.objects.filter(
                Q(captain=crew) | Q(first_officer=crew), status='completed'
            ).count(),
            'total_hours': float(crew.total_hours),
            'status': crew.status,
        })

    @action(detail=False, methods=['get'])
    def client(self, request):
        if request.user.role != 'client':
            return Response({'error': 'Forbidden.'}, status=403)

        upcoming = Flight.objects.filter(
            client=request.user,
            departure_dt__gte=timezone.now()
        ).order_by('departure_dt')[:5]

        past = Flight.objects.filter(
            client=request.user,
            status='completed'
        ).order_by('-departure_dt')[:5]

        return Response({
            'upcoming_flights': FlightSerializer(upcoming, many=True).data,
            'past_flights':     FlightSerializer(past, many=True).data,
            'total_flights':    Flight.objects.filter(client=request.user).count(),
            'pending_requests': CharterRequest.objects.filter(
                client_email=request.user.email, status='pending'
            ).count(),
        })