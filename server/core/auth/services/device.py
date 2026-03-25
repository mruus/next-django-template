"""
Device service for managing trusted devices.
"""

from datetime import timedelta

from django.utils import timezone

from core.models import TrustedDevice


class DeviceService:
    """Service for device-related operations."""

    @staticmethod
    def get_or_create_device(user, device_id, device_name="Unknown Device", device_type="other"):
        """
        Get or create a device for a user.

        Args:
            user: User instance
            device_id: Unique device identifier
            device_name: User-friendly device name
            device_type: Type of device

        Returns:
            tuple: (device, created)
        """
        # Use Django's get_or_create to handle race conditions atomically
        device, created = TrustedDevice.objects.get_or_create(
            user=user,
            device_id=device_id,
            defaults={
                'device_name': device_name,
                'device_type': device_type,
                'is_trusted': False
            }
        )

        # Update device name if provided and different (even if not newly created)
        if device_name and device_name != device.device_name:
            device.device_name = device_name
            device.save()

        return device, created

    @staticmethod
    def check_device_trust(user, device_id):
        """
        Check if a device is trusted for a user.

        Args:
            user: User instance
            device_id: Device identifier

        Returns:
            tuple: (is_trusted, device_instance or None)
        """
        try:
            device = TrustedDevice.objects.get(user=user, device_id=device_id)

            # Check if device trust has expired
            if device.is_expired():
                device.is_trusted = False
                device.save()
                return False, device

            return device.is_trusted, device

        except TrustedDevice.DoesNotExist:
            return False, None

    @staticmethod
    def trust_device(device, trust_days=30):
        """
        Trust a device for a specified number of days.

        Args:
            device: TrustedDevice instance
            trust_days: Number of days to trust the device

        Returns:
            TrustedDevice: Updated device
        """
        device.is_trusted = True
        device.trusted_until = timezone.now() + timedelta(days=trust_days)
        device.save()
        return device

    @staticmethod
    def untrust_device(device):
        """
        Remove trust from a device.

        Args:
            device: TrustedDevice instance

        Returns:
            TrustedDevice: Updated device
        """
        device.is_trusted = False
        device.trusted_until = None
        device.save()
        return device

    @staticmethod
    def update_device_info(device, user_agent=None, ip_address=None, device_name=None):
        """
        Update device information.

        Args:
            device: TrustedDevice instance
            user_agent: HTTP User-Agent string
            ip_address: IP address
            device_name: Device name

        Returns:
            TrustedDevice: Updated device
        """
        if user_agent:
            device.user_agent = user_agent
        if ip_address:
            device.ip_address = ip_address
        if device_name:
            device.device_name = device_name

        device.last_login = timezone.now()
        device.save()
        return device

    @staticmethod
    def get_user_devices(user):
        """
        Get all devices for a user.

        Args:
            user: User instance

        Returns:
            QuerySet: User's devices
        """
        return TrustedDevice.objects.filter(user=user).order_by('-last_login')

    @staticmethod
    def delete_device(device):
        """
        Delete a device.

        Args:
            device: TrustedDevice instance

        Returns:
            bool: True if deleted
        """
        device.delete()
        return True

    @staticmethod
    def cleanup_expired_devices(days=90):
        """
        Clean up devices that haven't been used for specified days.

        Args:
            days: Days of inactivity

        Returns:
            tuple: (deleted_count, deleted_details)
        """
        expired_date = timezone.now() - timedelta(days=days)
        return TrustedDevice.objects.filter(
            last_login__lt=expired_date,
            is_trusted=False
        ).delete()
