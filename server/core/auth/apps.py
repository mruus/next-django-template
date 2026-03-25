"""
Django app configuration for the authentication module.
"""

from django.apps import AppConfig


class AuthConfig(AppConfig):
    """Configuration for the authentication module."""

    name = 'core.auth'
    verbose_name = 'Authentication'

    def ready(self):
        """Import signals when the app is ready."""
        # Import signals here if needed
        pass
