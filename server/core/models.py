from django.db import models
from django.contrib.auth.models import AbstractUser
import uuid
from utils.defaults import DefaultModel, UploadPathModel
from django.contrib.auth.models import Permission
from treenode.models import TreeNodeModel

class User(AbstractUser, DefaultModel):
    GENDER_CHOICES = (
        ("Male", "Male"),
        ("Female", "Female"),
    )
    STATUS_CHOICES = (
        ("active", "Active"),
        ("suspended", "Suspended"),
        ("blocked", "Blocked"),
    )

    # Override groups and user_permissions to add related_name
    groups = models.ManyToManyField(
        'auth.Group',
        verbose_name='groups',
        blank=True,
        help_text='The groups this user belongs to. A user will get all permissions granted to each of their groups.',
        related_name='custom_user_set',
        related_query_name='user',
    )
    user_permissions = models.ManyToManyField(
        'auth.Permission',
        verbose_name='user permissions',
        blank=True,
        help_text='Specific permissions for this user.',
        related_name='custom_user_set',
        related_query_name='user',
    )

    gender = models.CharField(max_length=10, choices=GENDER_CHOICES, default="Male")
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default="active")
    email = models.EmailField(unique=True)
    phone = models.CharField(max_length=20, blank=True)
    avatar = avatar = models.FileField(
        upload_to=UploadPathModel,
        null=True,
        blank=True,
    )

    class Meta:
        verbose_name = 'User'
        verbose_name_plural = 'Users'

    def __str__(self):
        return f"{self.first_name} {self.last_name} ({self.username})"


class CustomPermissions(DefaultModel, TreeNodeModel):
    name = models.CharField(max_length=255)
    codename = models.CharField(max_length=255, blank=True, null=True)
    permission = models.ForeignKey(Permission, on_delete=models.CASCADE, blank=True, null=True)

    # NEW: tell treenode which field to show in tree
    treenode_display_field = "name"

    class Meta(TreeNodeModel.Meta):
        verbose_name = "Custom Permission"
        verbose_name_plural = "Custom Permissions"

    class TreeNodeMeta:
        parent_attr = "tn_parent"


class TrustedDevice(DefaultModel):
    """Model to track trusted devices for users."""

    DEVICE_TYPES = (
        ('desktop', 'Desktop'),
        ('laptop', 'Laptop'),
        ('mobile', 'Mobile'),
        ('tablet', 'Tablet'),
        ('other', 'Other'),
    )

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='trusted_devices')
    device_name = models.CharField(max_length=100, help_text="User-defined name for the device")
    device_type = models.CharField(max_length=20, choices=DEVICE_TYPES, default='other')
    device_id = models.CharField(max_length=255, help_text="Unique device identifier")
    user_agent = models.TextField(blank=True, help_text="HTTP User-Agent string")
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    last_login = models.DateTimeField(auto_now=True, help_text="Last time this device was used")
    is_trusted = models.BooleanField(default=True, help_text="Whether this device is trusted")
    trusted_until = models.DateTimeField(null=True, blank=True, help_text="Trust expiration date")
    location = models.CharField(max_length=255, blank=True, help_text="Approximate location")

    class Meta:
        verbose_name = 'Trusted Device'
        verbose_name_plural = 'Trusted Devices'
        ordering = ['-last_login']
        unique_together = ['user', 'device_id']

    def __str__(self):
        return f"{self.device_name} ({self.device_type}) for {self.user.username}"

    def is_expired(self):
        """Check if the device trust has expired."""
        if self.trusted_until:
            from django.utils import timezone
            return timezone.now() > self.trusted_until
        return False

    def mark_untrusted(self):
        """Mark device as untrusted."""
        self.is_trusted = False
        self.save()


class OTP(DefaultModel):
    """Model for storing and managing one-time passwords with security features."""

    OTP_TYPES = (
        ('email', 'Email OTP'),
        ('sms', 'SMS OTP'),
        ('totp', 'Time-based OTP'),
    )

    OTP_STATUS = (
        ('pending', 'Pending'),
        ('verified', 'Verified'),
        ('expired', 'Expired'),
        ('failed', 'Failed'),
        ('used', 'Used'),
    )

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='otps')
    otp_type = models.CharField(max_length=20, choices=OTP_TYPES, default='email')
    otp_code = models.CharField(max_length=10, help_text="The OTP code")
    purpose = models.CharField(max_length=100, help_text="Purpose of OTP (e.g., 'login', 'reset_password')")
    status = models.CharField(max_length=20, choices=OTP_STATUS, default='pending')
    expires_at = models.DateTimeField(help_text="When this OTP expires")
    verified_at = models.DateTimeField(null=True, blank=True, help_text="When this OTP was verified")

    # Security features
    failed_attempts = models.PositiveIntegerField(default=0)
    max_failed_attempts = models.PositiveIntegerField(default=5)
    lock_until = models.DateTimeField(null=True, blank=True)

    # Rate limiting
    next_allowed_request = models.DateTimeField(null=True, blank=True)

    device = models.ForeignKey(TrustedDevice, on_delete=models.SET_NULL, null=True, blank=True,
                              related_name='otps', help_text="Device used for OTP if applicable")
    ip_address = models.GenericIPAddressField(null=True, blank=True, help_text="IP address where OTP was requested")

    class Meta:
        verbose_name = 'OTP'
        verbose_name_plural = 'OTPs'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'status', 'expires_at']),
            models.Index(fields=['otp_code', 'status']),
        ]

    def __str__(self):
        return f"{self.otp_type} OTP for {self.user.username} ({self.status})"

    def is_expired(self):
        """Check if the OTP has expired."""
        from django.utils import timezone
        return timezone.now() > self.expires_at

    def is_valid(self):
        """Check if OTP is still valid (not expired, pending, and not locked)."""
        from django.utils import timezone

        if self.status != 'pending':
            return False

        if self.is_expired():
            return False

        if self.lock_until and timezone.now() < self.lock_until:
            return False

        return True

    def verify(self, code):
        """Verify the OTP code with security checks."""
        from utils.otp import verify_otp
        return verify_otp(self, code)

    def can_request_new(self):
        """Check if user can request a new OTP (rate limiting)."""
        from utils.otp import can_request_new_otp
        return can_request_new_otp(self)

    def set_next_request_time(self, cooldown_minutes=1):
        """Set when next OTP can be requested."""
        from utils.otp import set_next_request_time
        set_next_request_time(self, cooldown_minutes)

    @classmethod
    def cleanup_expired(cls, days=7):
        """Clean up expired OTPs older than specified days."""
        from utils.otp import cleanup_old_otps
        return cleanup_old_otps(days)
