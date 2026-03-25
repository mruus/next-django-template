import datetime
import functools
import sys

# Import removed to avoid circular import - use string reference instead
import uuid
from typing import Any, Callable, Union

import pendulum
from django.db import models
from django.utils import timezone
from rest_framework import serializers, status
from rest_framework.response import Response
from rich import print as rprint
from rich.console import Console
from rich.panel import Panel

# Import for permission decorator
from rest_framework.exceptions import PermissionDenied


class DefaultModel(models.Model):
    """
    Abstract base model with common fields + auto year/month from created_at
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # Keep date if you really want a separate DateField (but created_at already covers most cases)
    date = models.DateField(
        auto_now_add=True
    )  # optional — redundant with created_at.date()

    year = models.IntegerField(editable=False)  # will be set automatically
    month = models.IntegerField(editable=False)  # 1–12, will be set automatically
    day = models.IntegerField(editable=False)  # 1–31, will be set automatically

    language = models.CharField(max_length=10, default="en")
    is_active = models.BooleanField(default=True)
    is_deleted = models.BooleanField(default=False)

    created_by = models.ForeignKey(
        "core.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="%(app_label)s_%(class)s_created",
    )
    updated_by = models.ForeignKey(
        "core.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="%(app_label)s_%(class)s_updated",
    )

    created_at = models.DateTimeField(auto_now_add=True, editable=False)
    updated_at = models.DateTimeField(auto_now=True, editable=False)

    class Meta:
        abstract = True

    def save(self, *args, **kwargs):
        if self._state.adding:  # only on creation (first save)
            # Use created_at if already set by auto_now_add, otherwise fallback to now()
            creation_time = self.created_at if self.created_at else timezone.now()
            self.year = creation_time.year
            self.month = creation_time.month  # returns 1–12 naturally
            self.day = creation_time.day  # returns 1–31 naturally

        super().save(*args, **kwargs)

    @property
    def created_by_display(self):
        """Return user display name: full name > email > username."""
        if not self.created_by:
            return None

        # Try to get full name (first_name + last_name)
        if self.created_by.first_name and self.created_by.last_name:
            full_name = (
                f"{self.created_by.first_name} {self.created_by.last_name}".strip()
            )
            if full_name:
                return full_name

        # Fallback to email
        if self.created_by.email:
            return self.created_by.email

        # Final fallback to username
        return self.created_by.username

    @property
    def updated_by_display(self):
        """Return user display name: full name > email > username."""
        if not self.updated_by:
            return None

        # Try to get full name (first_name + last_name)
        if self.updated_by.first_name and self.updated_by.last_name:
            full_name = (
                f"{self.updated_by.first_name} {self.updated_by.last_name}".strip()
            )
            if full_name:
                return full_name

        # Fallback to email
        if self.updated_by.email:
            return self.updated_by.email

        # Final fallback to username
        return self.updated_by.username


def UploadPathModel(instance, filename, path="default"):
    # Handle filename with or without extension
    if "." in filename:
        ext = filename.split(".")[-1].lower()
    else:
        ext = "file"
    instance_id = instance.id if instance.id else "new_user"
    date_str = datetime.datetime.now().strftime("%Y-%m-%d")
    return f"{path}/{date_str}/{instance_id}.{ext}"


def flatten_errors(errors):
    """
    Recursively flatten error messages into a single string.
    SECURITY NOTE: This function safely formats error messages for user display
    without exposing sensitive internal details.
    """
    if isinstance(errors, list):
        messages = []
        for item in errors:
            messages.append(flatten_errors(item))
        return ", ".join(messages)
    elif isinstance(errors, dict):
        messages = []
        for key, val in errors.items():
            messages.append(f"{key}: {flatten_errors(val)}")
        return ", ".join(messages)
    return str(errors)


class APIResponse:
    as_dict = False

    @classmethod
    def _build(
        cls, *, is_error: bool, message: str, http_status: int
    ) -> Union[Response, dict]:
        payload = {
            "error": is_error,
            "message": message,
        }

        if cls.as_dict:
            payload["status"] = http_status
            return payload

        return Response(payload, status=http_status)

    @classmethod
    def success(cls, message: any, http_status=status.HTTP_200_OK) -> Response:
        return cls._build(
            is_error=False,
            message=message,
            http_status=http_status,
        )

    @classmethod
    def created(cls, message: str) -> Response:
        return cls._build(
            is_error=False,
            message=message,
            http_status=status.HTTP_201_CREATED,
        )

    @classmethod
    def error(cls, message: str, http_status=status.HTTP_400_BAD_REQUEST) -> Response:
        return cls._build(
            is_error=True,
            message=message,
            http_status=http_status,
        )

    @classmethod
    def unauthorized(cls, message: str = "Unauthorized") -> Response:
        return cls._build(
            is_error=True,
            message=message,
            http_status=status.HTTP_401_UNAUTHORIZED,
        )

    @classmethod
    def forbidden(cls, message: str = "Forbidden") -> Response:
        return cls._build(
            is_error=True,
            message=message,
            http_status=status.HTTP_403_FORBIDDEN,
        )

    @classmethod
    def not_found(cls, message: str = "Not found") -> Response:
        return cls._build(
            is_error=True,
            message=message,
            http_status=status.HTTP_404_NOT_FOUND,
        )


def handle_exceptions(view_func: Callable) -> Callable:
    """
    Beautiful exception handler using Rich.
    - Shows colored header
    - Exact file + line number where error happened
    - Full syntax-highlighted traceback
    - Clean error response to the client
    """

    @functools.wraps(view_func)
    def wrapper(*args, **kwargs) -> Any:
        try:
            return view_func(*args, **kwargs)
        except Exception as e:
            console = Console()
            # Get the real location of the error
            exc_type, exc_value, exc_traceback = sys.exc_info()
            while exc_traceback.tb_next:
                exc_traceback = exc_traceback.tb_next

            frame = exc_traceback.tb_frame
            filename = frame.f_code.co_filename
            line_no = exc_traceback.tb_lineno
            func_name = frame.f_code.co_name

            # === BEAUTIFUL RICH OUTPUT ===
            console.print(
                Panel.fit(
                    "[bold red]🚨 EXCEPTION CAUGHT IN VIEW[/bold red]",
                    style="bold red",
                )
            )

            rprint(
                f"[bold yellow]{exc_type.__name__}[/bold yellow]: {e} "
                f"[dim]({filename}:{line_no} in {func_name})[/dim]"
            )

            console.rule("[bold red]Traceback[/bold red]")
            console.print_exception(show_locals=False, max_frames=5, extra_lines=1)

            console.print("\n" + "=" * 80 + "\n")

            # Return clean response to the frontend / API client
            return APIResponse.error(
                message="An internal server error occurred. Please try again later.",
                http_status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    return wrapper


def require_permissions(
    codenames: Union[str, list[str]], 
    check_all: bool = True
) -> Callable:
    """
    Decorator for checking user permissions with superuser bypass.
    
    Args:
        codenames: Single permission codename or list of codenames to check
        check_all: If True, user must have ALL codenames. If False, user must have ANY one.
    
    Returns:
        Decorated view function that checks permissions before execution.
        
    Example:
        @require_permissions(["add_user", "change_user"])
        @require_permissions("view_user", check_all=True)
        @require_permissions(["add_user", "change_user"], check_all=False)
    """
    
    def decorator(view_func: Callable) -> Callable:
        @functools.wraps(view_func)
        def wrapper(*args, **kwargs) -> Any:
            # Import here to avoid circular imports
            from utils.cache import get_user_permissions_list, is_allowed_master_superuser
            
            # Get request from args (first arg is self for class-based views, second is request)
            request = None
            for arg in args:
                if hasattr(arg, 'user') and hasattr(arg, 'method'):
                    request = arg
                    break
            
            if not request:
                # Try to get from kwargs
                request = kwargs.get('request')
            
            if not request or not request.user or not request.user.is_authenticated:
                raise PermissionDenied("Authentication required")
            
            # Allow master superuser to bypass all permission checks
            if is_allowed_master_superuser(request.user):
                return view_func(*args, **kwargs)
            
            # Get user's effective permissions
            effective = set(get_user_permissions_list(request.user))
            
            # Normalize codenames to list
            if isinstance(codenames, str):
                required_codenames = [codenames]
            else:
                required_codenames = list(codenames)
            
            if not required_codenames:
                # No permissions required
                return view_func(*args, **kwargs)
            
            # Check permissions based on mode
            if check_all:
                # User must have ALL required permissions
                has_permission = all(codename in effective for codename in required_codenames)
            else:
                # User must have ANY of the required permissions
                has_permission = any(codename in effective for codename in required_codenames)
            
            if not has_permission:
                return APIResponse.forbidden(
                    message="You do not have permission to perform this action.",
                )
            
            return view_func(*args, **kwargs)
        
        return wrapper
    
    return decorator


class RobustDateTimeField(serializers.DateTimeField):
    """
    A custom DateTime field that converts the datetime from the database
    to GMT+3 (Africa/Mogadishu) and returns a relative time string.
    """

    def to_representation(self, value):
        if not value:
            return None

        if not isinstance(value, (datetime.datetime, datetime.date)):
            raise serializers.ValidationError("Invalid datetime format")

        try:
            dt = pendulum.instance(value).in_timezone("Africa/Mogadishu")
            now = pendulum.now("Africa/Mogadishu")
            diff_seconds = abs(now.diff(dt).in_seconds())

            # if diff_seconds < 60:
            #     relative = "just now"
            # elif dt.date() == now.date():
            #     # <-- use no-arg diff_for_humans here
            #     relative = dt.diff_for_humans()
            # elif dt.date() == now.subtract(days=1).date():
            #     relative = "Yesterday"
            # else:
            relative = dt.format("DD MMM YYYY, HH:mm")

            return relative

        except Exception:
            return None
