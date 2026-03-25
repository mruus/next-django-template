"""
Authentication utilities using service classes.
"""

import hashlib
import uuid

from django.contrib.auth import authenticate
from django.utils import timezone

from .services.device import DeviceService
from .services.otp import OTPService
from .services.tokens import TokenService


def get_client_ip(request):
    """
    Get client IP address with proxy awareness.

    Args:
        request: Django request object

    Returns:
        str: Client IP address or empty string
    """
    xff = request.META.get('HTTP_X_FORWARDED_FOR')
    if xff:
        return xff.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR', '')


def get_device_fingerprint(request):
    """
    Generate a canonical device fingerprint from request data.

    Based on test.txt guide: Uses UA + Accept-Language + IP prefix

    Args:
        request: Django request object

    Returns:
        str: SHA256 hash of device fingerprint
    """
    # Get user agent
    ua = request.META.get('HTTP_USER_AGENT', '')

    # Get accept language
    lang = request.META.get('HTTP_ACCEPT_LANGUAGE', '')

    # Get IP address
    ip = get_client_ip(request) or ''

    # Use IP prefix, not full IP (first 3 octets for IPv4)
    if '.' in ip:
        ip_parts = ip.split('.')
        if len(ip_parts) >= 3:
            ip_prefix = '.'.join(ip_parts[:3])
        else:
            ip_prefix = ip
    else:
        ip_prefix = ip

    # Create canonical fingerprint
    raw = f"{ua}|{lang}|{ip_prefix}"
    return hashlib.sha256(raw.encode()).hexdigest()


def extract_device_info_from_request(request):
    """
    Extract device information directly from request.META.

    Args:
        request: Django request object

    Returns:
        dict: Device information dictionary
    """
    # Get user agent
    user_agent = request.META.get('HTTP_USER_AGENT', '')

    # Get IP address
    ip_address = get_client_ip(request)

    # Get accept language
    accept_language = request.META.get('HTTP_ACCEPT_LANGUAGE', '')

    # Generate device fingerprint
    device_id = get_device_fingerprint(request)

    # Derive device name from user agent
    device_name = _derive_device_name(user_agent)

    return {
        'device_id': device_id,
        'user_agent': user_agent,
        'ip_address': ip_address,
        'device_name': device_name,
        'accept_language': accept_language,
    }


def _derive_device_name(user_agent):
    """
    Derive a human-readable device name from user agent.

    Args:
        user_agent: HTTP User-Agent string

    Returns:
        str: Human-readable device name
    """
    if not user_agent:
        return "Unknown Device"

    # Simple parsing for common browsers
    user_agent_lower = user_agent.lower()

    if 'chrome' in user_agent_lower and 'mobile' in user_agent_lower:
        return "Chrome Mobile"
    elif 'chrome' in user_agent_lower:
        return "Chrome"
    elif 'firefox' in user_agent_lower:
        return "Firefox"
    elif 'safari' in user_agent_lower and 'mobile' in user_agent_lower:
        return "Safari Mobile"
    elif 'safari' in user_agent_lower:
        return "Safari"
    elif 'edge' in user_agent_lower:
        return "Edge"
    elif 'opera' in user_agent_lower:
        return "Opera"
    elif 'android' in user_agent_lower:
        return "Android Browser"
    elif 'iphone' in user_agent_lower or 'ipad' in user_agent_lower:
        return "iOS Browser"
    elif 'postman' in user_agent_lower:
        return "Postman"
    elif 'curl' in user_agent_lower:
        return "cURL"

    return "Web Browser"


def authenticate_user(email, password):
    """
    Authenticate a user with email and password.

    Args:
        email: User email
        password: Password

    Returns:
        tuple: (user, error_message)
    """
    user = authenticate(request=None, username=email, password=password)

    if not user:
        return None, "Invalid credentials"

    if not user.is_active:
        return None, "User account is disabled"

    return user, None


def handle_login_flow(user, device_id, user_agent=None, ip_address=None, device_name=None):
    """
    Handle the login flow for a user.

    Args:
        user: User instance
        device_id: Device identifier
        user_agent: HTTP User-Agent string
        ip_address: IP address
        device_name: Device name

    Returns:
        dict: Login response data
    """
    # Check device trust
    is_trusted, device = DeviceService.check_device_trust(user, device_id)

    if is_trusted and device:
        # Update device info
        DeviceService.update_device_info(device, user_agent, ip_address, device_name)

        # Generate tokens
        tokens = TokenService.generate_tokens(user)
        response = TokenService.create_token_response(
            tokens,
            requires_otp=False,
            message="Login successful with trusted device"
        )
        return response

    # Device not trusted, initiate OTP flow
    # Check if we can request OTP
    can_request, message, wait_seconds = OTPService.can_request_otp(user, device_id)
    if not can_request:
        return {
            'requires_otp': True,
            'message': message,
            'wait_seconds': wait_seconds,
            'user_id': user.id,
            'email': user.email,
        }

    # Create OTP
    otp = OTPService.create_login_otp(user, device_id, ip_address)

    # Get or create device
    device, created = DeviceService.get_or_create_device(
        user, device_id, device_name or "Unknown Device"
    )

    # Update device info
    DeviceService.update_device_info(device, user_agent, ip_address, device_name)

    # Create OTP response
    response = TokenService.create_otp_response(
        user,
        message="OTP sent to your email"
    )
    response['device_id'] = device_id
    return response


def handle_otp_verification(email, otp_code, device_id, remember_device=True, device_name=None):
    """
    Handle OTP verification flow.

    Args:
        email: User email
        otp_code: OTP code
        device_id: Device identifier
        remember_device: Whether to remember the device
        device_name: Device name

    Returns:
        tuple: (success, response_data, error_message)
    """
    # Verify OTP
    success, message, otp = OTPService.verify_otp(email, otp_code)

    if not success:
        return False, None, message

    # Get user from OTP
    user = otp.user

    # Handle device trust if requested
    if remember_device:
        # Get or create device
        device, created = DeviceService.get_or_create_device(
            user, device_id, device_name or "Trusted Device"
        )
        # Trust the device
        DeviceService.trust_device(device)

    # Generate tokens
    tokens = TokenService.generate_tokens(user)

    # Create response
    response = TokenService.create_token_response(
        tokens,
        requires_otp=False,
        message="OTP verified successfully" + (
            ". Device will be remembered for 30 days" if remember_device else ""
        )
    )

    return True, response, None


def cleanup_authentication_data(days=7):
    """
    Clean up old authentication data.

    Args:
        days: Days threshold for cleanup

    Returns:
        dict: Cleanup results
    """
    # Clean up expired OTPs
    otp_deleted = OTPService.cleanup_expired_otps(days)

    # Clean up expired devices
    device_deleted = DeviceService.cleanup_expired_devices(days * 3)  # 3x longer for devices

    return {
        'otps_deleted': otp_deleted,
        'devices_deleted': device_deleted,
    }
