from django.apps import AppConfig


class CoreConfig(AppConfig):
    name = 'core'

    def ready(self):
        # Import and register signals
        # Import here to avoid Django setup issues
        from . import signals  # noqa
