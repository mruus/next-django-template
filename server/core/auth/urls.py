from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView, TokenVerifyView

from . import views

app_name = "core_auth"

urlpatterns = [
    # Login with device checking
    path("login/", views.LoginView.as_view(), name="login"),
    # OTP verification
    path("verify-otp/", views.VerifyOTPView.as_view(), name="verify-otp"),
    # OTP resend
    path("resend-otp/", views.ResendOTPView.as_view(), name="resend-otp"),
    path("token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("token/verify/", TokenVerifyView.as_view(), name="token_verify"),
]
