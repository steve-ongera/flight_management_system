from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView
from . import views

router = DefaultRouter()
router.register(r'auth',          views.AuthViewSet,          basename='auth')
router.register(r'airports',      views.AirportViewSet,       basename='airports')
router.register(r'aircraft',      views.AircraftViewSet,      basename='aircraft')
router.register(r'crew',          views.CrewMemberViewSet,    basename='crew')
router.register(r'charter-requests', views.CharterRequestViewSet, basename='charter-requests')
router.register(r'flights',       views.FlightViewSet,        basename='flights')
router.register(r'maintenance',   views.MaintenanceLogViewSet, basename='maintenance')
router.register(r'invoices',      views.InvoiceViewSet,       basename='invoices')
router.register(r'email-log',     views.EmailLogViewSet,      basename='email-log')
router.register(r'notifications', views.NotificationViewSet,  basename='notifications')
router.register(r'calculator',    views.PriceCalculatorViewSet, basename='calculator')
router.register(r'users',         views.UserAdminViewSet,     basename='users')
router.register(r'dashboard',     views.DashboardViewSet,     basename='dashboard')

urlpatterns = [
    path('api/', include(router.urls)),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
]