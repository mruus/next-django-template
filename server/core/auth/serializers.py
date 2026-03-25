"""
Authentication serializers for user login and OTP verification.

Note: Business logic has been moved to FormValidationService.
These serializers now only handle data serialization/deserialization.
"""

from rest_framework import serializers


class LoginSerializer(serializers.Serializer):
    """Serializer for user login with device checking.

    Note: device_id and device_name are extracted from headers automatically.
    They are not required in the request body.
    """

    email = serializers.EmailField(required=True)
    password = serializers.CharField(required=True, write_only=True)
    device_id = serializers.CharField(required=False, allow_blank=True, allow_null=True, help_text="Auto-extracted from request metadata")
    device_name = serializers.CharField(required=False, allow_blank=True, allow_null=True, default="Unknown Device", help_text="Auto-derived from user agent")
    user_agent = serializers.CharField(required=False, allow_blank=True, default="", help_text="Auto-extracted from request metadata")
    ip_address = serializers.IPAddressField(required=False, allow_null=True, help_text="Auto-extracted from request metadata")

    def validate(self, attrs):
        """Ensure device_id is set from headers if not provided."""
        # device_id should be set from headers in the view, but if it's missing,
        # we'll use a default (this should not happen if headers are properly set)
        if not attrs.get('device_id'):
            attrs['device_id'] = 'unknown'
        if not attrs.get('device_name'):
            attrs['device_name'] = 'Unknown Device'
        return attrs


class OTPVerificationSerializer(serializers.Serializer):
    """Serializer for OTP verification.

    Note: device_id and device_name are extracted from headers automatically.
    They are not required in the request body.
    """

    email = serializers.EmailField(required=True)
    otp_code = serializers.CharField(required=True, max_length=10)
    device_id = serializers.CharField(required=False, allow_blank=True, allow_null=True, help_text="Auto-extracted from request metadata")
    remember_device = serializers.BooleanField(default=False, required=False)
    device_name = serializers.CharField(required=False, allow_blank=True, allow_null=True, default="Unknown Device", help_text="Auto-derived from user agent")

    def validate(self, attrs):
        """Ensure device_id is set from headers if not provided."""
        # device_id should be set from headers in the view, but if it's missing,
        # we'll use a default (this should not happen if headers are properly set)
        if not attrs.get('device_id'):
            attrs['device_id'] = 'unknown'
        if not attrs.get('device_name'):
            attrs['device_name'] = 'Unknown Device'
        return attrs


class ResendOTPSerializer(serializers.Serializer):
    """Serializer for OTP resend."""

    email = serializers.EmailField(required=True)
    device_id = serializers.CharField(required=False, allow_blank=True, allow_null=True, help_text="Auto-extracted from request metadata")

    def validate(self, attrs):
        if not attrs.get('device_id'):
            attrs['device_id'] = 'unknown'
        return attrs


class TokenResponseSerializer(serializers.Serializer):
    """Serializer for token response."""

    access = serializers.CharField()
    refresh = serializers.CharField()
    user_id = serializers.UUIDField()
    email = serializers.EmailField()
    first_name = serializers.CharField(allow_blank=True)
    last_name = serializers.CharField(allow_blank=True)

    requires_otp = serializers.BooleanField()
    message = serializers.CharField(required=False)


class OTPResponseSerializer(serializers.Serializer):
    """Serializer for OTP response."""

    requires_otp = serializers.BooleanField()
    message = serializers.CharField()
    user_id = serializers.UUIDField(required=False)
    email = serializers.EmailField(required=False)
    wait_seconds = serializers.IntegerField(required=False)
