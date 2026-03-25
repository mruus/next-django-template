"""
Form validation service for authentication forms.

This service handles the validation logic that was previously in serializers,
moving business logic out of serializers and into dedicated services.
"""

from django.contrib.auth import authenticate

from .device import DeviceService
from .otp import OTPService


class FormValidationService:
    """Service for form validation logic."""

    @staticmethod
    def validate_login_form(email, password, device_id, user_agent=None, ip_address=None, device_name=None):
        """
        Validate login form data.

        Args:
            email: User email
            password: Password
            device_id: Unique device identifier
            user_agent: HTTP User-Agent string
            ip_address: IP address
            device_name: Device name

        Returns:
            dict: Validation result with user, device info, and any errors
        """
        result = {
            'is_valid': False,
            'errors': {},
            'user': None,
            'device_trusted': False,
            'device': None,
        }

        # Authenticate user by email
        user = authenticate(request=None, username=email, password=password)

        if not user:
            result['errors']['credentials'] = "Invalid credentials"
            return result

        if not user.is_active:
            result['errors']['account'] = "User account is disabled"
            return result

        # Account type check removed - no longer needed

        # Check if device is trusted using DeviceService
        is_trusted, device = DeviceService.check_device_trust(user, device_id)

        # Update device info if device exists
        if device:
            DeviceService.update_device_info(
                device,
                user_agent=user_agent or '',
                ip_address=ip_address,
                device_name=device_name or "Unknown Device"
            )

        result.update({
            'is_valid': True,
            'user': user,
            'device_trusted': is_trusted,
            'device': device,
        })

        return result

    @staticmethod
    def validate_otp_verification_form(email, otp_code, device_id, remember_device=False, device_name=None):
        """
        Validate OTP verification form data.

        Args:
            email: User email
            otp_code: OTP code
            device_id: Device identifier
            remember_device: Whether to remember the device
            device_name: Device name

        Returns:
            dict: Validation result with user, OTP, and any errors
        """
        result = {
            'is_valid': False,
            'errors': {},
            'user': None,
            'otp': None,
        }

        # Verify OTP using OTPService
        success, message, otp = OTPService.verify_otp(email, otp_code)

        if not success:
            result['errors']['otp'] = message
            return result

        # Handle device trust if requested
        if remember_device and otp and otp.user:
            FormValidationService._handle_device_trust(otp.user, device_id, device_name)

        if otp and otp.user:
            result.update({
                'is_valid': True,
                'user': otp.user,
                'otp': otp,
            })
        else:
            result['is_valid'] = False
            result['errors']['otp'] = "Invalid OTP or user"

        return result

    @staticmethod
    def _handle_device_trust(user, device_id, device_name):
        """
        Create or update trusted device using DeviceService.

        Args:
            user: User instance
            device_id: Device identifier
            device_name: Device name
        """
        # Get or create device
        device, created = DeviceService.get_or_create_device(
            user, device_id, device_name or "Trusted Device"
        )
        # Trust the device
        DeviceService.trust_device(device)

    @staticmethod
    def validate_device_form(device_id, device_name=None, user_agent=None, ip_address=None):
        """
        Validate device form data.

        Args:
            device_id: Device identifier
            device_name: Device name
            user_agent: HTTP User-Agent string
            ip_address: IP address

        Returns:
            dict: Validation result with any errors
        """
        result = {
            'is_valid': True,
            'errors': {},
        }

        if not device_id or not device_id.strip():
            result['is_valid'] = False
            result['errors']['device_id'] = "Device ID is required"

        if device_name and len(device_name) > 100:
            result['is_valid'] = False
            result['errors']['device_name'] = "Device name must be 100 characters or less"

        return result

    @staticmethod
    def validate_user_form(email, password=None, confirm_password=None):
        """
        Validate user form data.

        Args:
            email: User email
            password: Password (optional for some operations)
            confirm_password: Confirm password (optional)

        Returns:
            dict: Validation result with any errors
        """
        result = {
            'is_valid': True,
            'errors': {},
        }

        # Validate email
        if not email or '@' not in email:
            result['is_valid'] = False
            result['errors']['email'] = "Valid email is required"

        # Validate password if provided
        if password is not None:
            if len(password) < 8:
                result['is_valid'] = False
                result['errors']['password'] = "Password must be at least 8 characters"

            if confirm_password is not None and password != confirm_password:
                result['is_valid'] = False
                result['errors']['confirm_password'] = "Passwords do not match"

        return result

    @staticmethod
    def validate_otp_form(email, otp_code):
        """
        Validate OTP form data.

        Args:
            email: User email
            otp_code: OTP code

        Returns:
            dict: Validation result with any errors
        """
        result = {
            'is_valid': True,
            'errors': {},
        }

        if not email or '@' not in email:
            result['is_valid'] = False
            result['errors']['email'] = "Valid email is required"

        if not otp_code or len(otp_code) < 4:
            result['is_valid'] = False
            result['errors']['otp_code'] = "Valid OTP code is required"

        return result
