from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView
from . import views

router = DefaultRouter()
router.register(r'auth',             views.AuthViewSet,            basename='auth')
router.register(r'airports',         views.AirportViewSet,         basename='airports')
router.register(r'aircraft',         views.AircraftViewSet,        basename='aircraft')
router.register(r'crew',             views.CrewMemberViewSet,      basename='crew')
router.register(r'charter-requests', views.CharterRequestViewSet,  basename='charter-requests')
router.register(r'flights',          views.FlightViewSet,          basename='flights')
router.register(r'maintenance',      views.MaintenanceLogViewSet,  basename='maintenance')
router.register(r'invoices',         views.InvoiceViewSet,         basename='invoices')
router.register(r'email-log',        views.EmailLogViewSet,        basename='email-log')
router.register(r'notifications',    views.NotificationViewSet,    basename='notifications')
router.register(r'calculator',       views.PriceCalculatorViewSet, basename='calculator')
router.register(r'users',            views.UserAdminViewSet,       basename='users')
router.register(r'dashboard',        views.DashboardViewSet,       basename='dashboard')

urlpatterns = [
    path('', include(router.urls)),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),

    # ── dashboard shortcuts (what the frontend actually calls) ───────
    path('dashboard/',               views.DashboardViewSet.as_view({'get': 'admin'}),         name='dashboard-main'),
    path('dashboard/revenue-chart/', views.DashboardViewSet.as_view({'get': 'revenue_chart'}), name='dashboard-revenue'),
    path('dashboard/fleet-status/',  views.DashboardViewSet.as_view({'get': 'fleet_status'}),  name='dashboard-fleet'),
    path('dashboard/pilot/',         views.DashboardViewSet.as_view({'get': 'pilot'}),         name='dashboard-pilot'),
    path('dashboard/client/',        views.DashboardViewSet.as_view({'get': 'client'}),        name='dashboard-client'),

    # ── admin-namespaced aliases ─────────────────────────────────────
    path('admin/bookings/',          views.FlightViewSet.as_view({'get': 'list', 'post': 'create'}),          name='admin-bookings'),
    path('admin/bookings/<int:pk>/', views.FlightViewSet.as_view({'get': 'retrieve', 'put': 'update', 'patch': 'partial_update', 'delete': 'destroy'}), name='admin-bookings-detail'),

    path('admin/users/',             views.UserAdminViewSet.as_view({'get': 'list', 'post': 'create'}),       name='admin-users'),
    path('admin/users/<int:pk>/',    views.UserAdminViewSet.as_view({'get': 'retrieve', 'put': 'update', 'patch': 'partial_update', 'delete': 'destroy'}), name='admin-users-detail'),

    path('admin/commission/',        views.DashboardViewSet.as_view({'get': 'revenue_chart'}), name='admin-commission'),
]