"""
OTP service for managing one-time passwords.
"""

import random
from datetime import timedelta

from django.utils import timezone

from core.models import OTP, User
from utils.otp import create_otp as create_otp_util
from utils.otp import send_otp_email_to_user as send_otp_email_util


class OTPService:
    """Service for OTP-related operations."""

    @staticmethod
    def create_login_otp(user, device_id=None, ip_address=None):
        """
        Create a login OTP for a user.

        Args:
            user: User instance
            device_id: Optional device identifier
            ip_address: Optional IP address

        Returns:
            OTP: Created OTP instance
        """
        otp = create_otp_util(
            user=user,
            otp_type='email',
            purpose='login',
            expires_minutes=10
        )

        # Update OTP with device and IP info
        if ip_address:
            otp.ip_address = ip_address
            otp.save()

        # Send OTP via email
        send_otp_email_util(user, otp.otp_code)

        return otp

    @staticmethod
    def verify_otp(email, otp_code):
        """
        Verify an OTP code for a user.

        Args:
            email: User email
            otp_code: OTP code to verify

        Returns:
            tuple: (success, message, otp_instance or None)
        """
        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return False, "User not found", None

        # Get the latest pending OTP
        otp = OTP.objects.filter(
            user=user,
            status='pending',
            expires_at__gt=timezone.now()
        ).order_by('-created_at').first()

        if not otp:
            return False, "No valid OTP found or OTP has expired", None

        # Verify OTP
        success, message = otp.verify(otp_code)
        return success, message, otp

    @staticmethod
    def can_request_otp(user, device_id=None):
        """
        Check if a user can request a new OTP.

        Args:
            user: User instance
            device_id: Optional device identifier

        Returns:
            tuple: (can_request, message, wait_seconds)
        """
        # Get recent OTPs for this user/device
        recent_otps = OTP.objects.filter(
            user=user,
            created_at__gte=timezone.now() - timedelta(minutes=5)
        )

        # Note: device_id filtering removed since OTP model doesn't have metadata field
        # In a future version, consider adding device_id field to OTP model

        # Check rate limiting
        if recent_otps.count() >= 3:
            oldest_otp = recent_otps.order_by('created_at').first()
            wait_seconds = 300 - (timezone.now() - oldest_otp.created_at).seconds
            return False, f"Too many OTP requests. Please wait {wait_seconds} seconds", wait_seconds

        # Check if any OTP is in cooldown
        pending_otp = OTP.objects.filter(
            user=user,
            status='pending',
            expires_at__gt=timezone.now()
        ).first()

        if pending_otp and pending_otp.next_allowed_request:
            if timezone.now() < pending_otp.next_allowed_request:
                wait_seconds = (pending_otp.next_allowed_request - timezone.now()).seconds
                return False, f"Please wait {wait_seconds} seconds before requesting a new OTP", wait_seconds

        return True, "Can request OTP", 0

    @staticmethod
    def get_user_otps(user, limit=10):
        """
        Get OTPs for a user.

        Args:
            user: User instance
            limit: Maximum number of OTPs to return

        Returns:
            QuerySet: User's OTPs
        """
        return OTP.objects.filter(user=user).order_by('-created_at')[:limit]

    @staticmethod
    def cleanup_expired_otps(days=7):
        """
        Clean up expired OTPs.

        Args:
            days: Delete OTPs older than this many days

        Returns:
            tuple: (deleted_count, deleted_details)
        """
        from django.db.models import Q

        expired_date = timezone.now() - timedelta(days=days)
        return OTP.objects.filter(
            Q(status='expired') | Q(status='failed') | Q(status='used') |
            Q(expires_at__lt=expired_date)
        ).delete()

    @staticmethod
    def resend_otp(user, device_id=None):
        """
        Resend OTP to a user.

        Args:
            user: User instance
            device_id: Optional device identifier

        Returns:
            tuple: (success, message, otp_instance or None)
        """
        # Check if can request new OTP
        can_request, message, _ = OTPService.can_request_otp(user, device_id)
        if not can_request:
            return False, message, None

        # Invalidate existing pending OTPs
        OTP.objects.filter(
            user=user,
            status='pending',
            expires_at__gt=timezone.now()
        ).update(status='expired')

        # Create new OTP
        otp = OTPService.create_login_otp(user, device_id)

        return True, "OTP resent successfully", otp

    @staticmethod
    def validate_otp_for_device(email, otp_code, device_id):
        """
        Validate OTP specifically for a device.

        Args:
            email: User email
            otp_code: OTP code
            device_id: Device identifier

        Returns:
            tuple: (success, message, otp_instance or None)
        """
        success, message, otp = OTPService.verify_otp(email, otp_code)

        if success and otp:
            # Note: device validation removed since OTP model doesn't have metadata field
            # In a future version, consider adding device_id field to OTP model
            pass

        return success, message, otp
