"""
Authentication views for user login and OTP verification.

Note: All business logic and condition checks have been moved to services.
These views now only handle request/response coordination.

Device information is extracted directly from request.META
using extract_device_info_from_request utility.
"""

from rest_framework import status
from rest_framework.generics import CreateAPIView
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from utils.defaults import handle_exceptions

from .serializers import LoginSerializer, OTPVerificationSerializer, ResendOTPSerializer
from .services import AuthFlowService


class LoginView(CreateAPIView):
    """
    Handle user login with device checking.

    Workflow:
    1. User provides credentials and device info
    2. System checks if device is trusted
    3. If trusted: Return JWT tokens immediately
    4. If not trusted: Initiate OTP flow
    """

    serializer_class = LoginSerializer
    permission_classes = [AllowAny]

    @handle_exceptions
    def create(self, request, *args, **kwargs):
        """
        Handle login request using AuthFlowService.
        Device info is extracted directly from request.META.
        """
        # Extract device info directly from request
        from .utils import extract_device_info_from_request
        device_info = extract_device_info_from_request(request)

        # Merge device info into request data (device info takes precedence)
        request_data = request.data.copy()
        request_data.update(device_info)

        return AuthFlowService.handle_login_request(request_data, self.serializer_class)


class VerifyOTPView(CreateAPIView):
    """
    Handle OTP verification.

    Workflow:
    1. User provides OTP code
    2. System verifies OTP
    3. If valid: Return JWT tokens
    4. Optionally remember device for future logins
    """

    serializer_class = OTPVerificationSerializer
    permission_classes = [AllowAny]

    @handle_exceptions
    def create(self, request, *args, **kwargs):
        """
        Handle OTP verification request using AuthFlowService.
        Device info is extracted directly from request.META.
        """
        # Extract device info directly from request
        from .utils import extract_device_info_from_request
        device_info = extract_device_info_from_request(request)

        # Merge device info into request data (device info takes precedence)
        request_data = request.data.copy()
        request_data.update(device_info)

        return AuthFlowService.handle_otp_verification_request(
            request_data, self.serializer_class
        )


class ResendOTPView(CreateAPIView):
    """
    Resend OTP for login flow.

    Workflow:
    1. User provides email
    2. System checks cooldown/rate limiting
    3. If allowed: resend OTP and return success + cooldown seconds
    """

    serializer_class = ResendOTPSerializer
    permission_classes = [AllowAny]

    @handle_exceptions
    def create(self, request, *args, **kwargs):
        from core.models import User

        from .services.otp import OTPService
        from .utils import extract_device_info_from_request

        device_info = extract_device_info_from_request(request)
        request_data = request.data.copy()
        request_data.update(device_info)

        serializer = self.serializer_class(data=request_data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        email = serializer.validated_data["email"]
        device_id = serializer.validated_data.get("device_id")

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response(
                {"message": "User not found"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        can_request, message, wait_seconds = OTPService.can_request_otp(user, device_id)
        if not can_request:
            return Response(
                {"message": message, "wait_seconds": wait_seconds},
                status=status.HTTP_429_TOO_MANY_REQUESTS,
            )

        success, message, _otp = OTPService.resend_otp(user, device_id)
        if not success:
            return Response(
                {"message": message},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            {"message": message, "wait_seconds": 60},
            status=status.HTTP_200_OK,
        )
