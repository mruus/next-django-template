"""
OTP utility functions including verification logic.
"""

import random
import string
from datetime import timedelta

from django.db.models import Q
from django.utils import timezone


def generate_otp_code(length=6):
    """Generate a random numeric OTP code."""
    digits = string.digits
    return ''.join(random.choice(digits) for _ in range(length))


def verify_otp(otp_instance, code):
    """
    Verify an OTP code with security checks.

    Args:
        otp_instance: OTP model instance
        code: The code to verify

    Returns:
        tuple: (success, message)
    """
    now = timezone.now()

    # Check if locked
    if otp_instance.lock_until and now < otp_instance.lock_until:
        return False, "Device is temporarily locked"

    # Check if expired
    if otp_instance.is_expired():
        otp_instance.status = 'expired'
        otp_instance.save()
        return False, "OTP has expired"

    # Check if already used
    if otp_instance.status == 'used':
        return False, "OTP already used"

    # Verify code
    if otp_instance.otp_code != code:
        otp_instance.failed_attempts += 1
        otp_instance.save()

        # Lock if too many failed attempts
        if otp_instance.failed_attempts >= otp_instance.max_failed_attempts:
            lock_minutes = random.randint(5, 10)  # Random lock between 5-10 minutes
            otp_instance.lock_until = now + timezone.timedelta(minutes=lock_minutes)
            otp_instance.save()
            return False, f"Too many failed attempts. Try again in {lock_minutes} minutes"

        return False, "Invalid OTP"

    # Success - mark as used
    otp_instance.status = 'used'
    otp_instance.verified_at = now
    otp_instance.failed_attempts = 0
    otp_instance.lock_until = None
    otp_instance.save()

    return True, "OTP verified successfully"


def can_request_new_otp(otp_instance):
    """
    Check if user can request a new OTP (rate limiting).

    Args:
        otp_instance: OTP model instance

    Returns:
        bool: True if can request new OTP
    """
    if not otp_instance.next_allowed_request:
        return True

    return timezone.now() >= otp_instance.next_allowed_request


def set_next_request_time(otp_instance, cooldown_minutes=1):
    """
    Set when next OTP can be requested.

    Args:
        otp_instance: OTP model instance
        cooldown_minutes: Minutes to wait before next request
    """
    # Add random offset to prevent timing attacks
    offset_seconds = random.randint(5, 30)
    otp_instance.next_allowed_request = timezone.now() + timezone.timedelta(
        minutes=cooldown_minutes,
        seconds=offset_seconds
    )
    otp_instance.save()


def create_otp(user, otp_type='email', purpose='login', expires_minutes=10):
    """
    Create a new OTP instance.

    Args:
        user: User instance
        otp_type: Type of OTP (email, sms, totp)
        purpose: Purpose of OTP
        expires_minutes: Minutes until OTP expires

    Returns:
        OTP instance
    """
    from core.models import OTP

    otp_code = generate_otp_code()
    expires_at = timezone.now() + timedelta(minutes=expires_minutes)

    otp = OTP.objects.create(
        user=user,
        otp_type=otp_type,
        otp_code=otp_code,
        purpose=purpose,
        expires_at=expires_at,
        status='pending'
    )

    # Set rate limiting for next request
    set_next_request_time(otp)

    return otp


def send_otp_email_to_user(user, otp_code):
    """
    Send OTP via email using the email service.

    Args:
        user: User instance
        otp_code: The OTP code to send

    Returns:
        bool: True if successful
    """
    from .email import send_otp_email
    return send_otp_email(user, otp_code)


def cleanup_old_otps(days=7):
    """Clean up OTPs older than specified days."""
    from core.models import OTP

    expired_date = timezone.now() - timedelta(days=days)
    deleted = OTP.objects.filter(
        Q(status='expired') | Q(status='failed') | Q(status='used') |
        Q(expires_at__lt=expired_date)
    ).delete()

    return deleted
