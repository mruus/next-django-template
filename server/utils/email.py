"""
Simplified email service for sending OTP and welcome emails.
"""

from django.conf import settings
from django.core.mail import send_mail


def send_otp_email(user, otp_code):
    """
    Send OTP email to user.

    Args:
        user: User instance with email attribute
        otp_code: The OTP code to send

    Returns:
        bool: True if email was sent or printed successfully
    """
    subject = "Your OTP Code"

    # Plain text content for OTP email
    message = f"""Hello {user.email},

Your One-Time Password (OTP) code is: {otp_code}

This code will expire in 10 minutes.

If you did not request this OTP, please ignore this email.

Best regards,
The Access Gateway Team
"""

    from_email = getattr(settings, "DEFAULT_FROM_EMAIL", "noreply@example.com")

    # If DEBUG is True, print to terminal
    if getattr(settings, "DEBUG", False):
        print(f"\n{'=' * 50}")
        print("DEBUG MODE: Email NOT sent (printed to terminal only)")
        print(f"To: {user.email}")
        print(f"OTP Code: {otp_code}")
        print(f"Subject: {subject}")
        print("\nTo actually send emails, set DEBUG=False in .env file")
        print(f"{'=' * 50}\n")
        return True

    # If DEBUG is False, try to send email
    try:
        # Check if email is configured
        if not getattr(settings, "EMAIL_HOST", None):
            print("ERROR: EMAIL_HOST is not configured in settings.py")
            print("Check email configuration in server/config/settings.py")
            return False

        print(f"PRODUCTION MODE: Attempting to send OTP email to {user.email}")

        send_mail(
            subject=subject,
            message=message,
            from_email=from_email,
            recipient_list=[user.email],
            fail_silently=False,
        )
        print(f"SUCCESS: OTP email sent to {user.email}")
        print(f"From: {from_email}")
        print(f"Check spam folder if not received")
        return True

    except Exception as e:
        print(f"ERROR sending OTP email: {e}")
        print("Check email configuration:")
        print(f"1. EMAIL_HOST: {getattr(settings, 'EMAIL_HOST', 'NOT SET')}")
        print(f"2. EMAIL_HOST_USER: {getattr(settings, 'EMAIL_HOST_USER', 'NOT SET')}")
        print(f"3. Check .env file for EMAILHOSTUSERNAME and EMAILHOSTPASSWORD")
        return False


def send_welcome_email(user, password):
    """
    Send welcome email to new user with credentials.

    Args:
        user: User instance with email, username attributes
        password: The generated password for the user

    Returns:
        bool: True if email was sent or printed successfully
    """
    subject = "Welcome to Access Gateway - Your Account Credentials"

    # Plain text content for welcome email
    message = f"""Hello {user.first_name or user.username or user.email},

Welcome to Access Gateway! Your account has been successfully created.

Here are your login credentials:
- Username: {user.username}
- Email: {user.email}
- Password: {password}

For security reasons, we recommend changing your password after your first login.

You can log in at: [Your Login URL Here]

If you have any questions or need assistance, please contact our support team.

Best regards,
The Access Gateway Team
"""

    from_email = getattr(settings, "DEFAULT_FROM_EMAIL", "noreply@example.com")

    # If DEBUG is True, print to terminal
    if getattr(settings, "DEBUG", False):
        print(f"\n{'=' * 50}")
        print("DEBUG MODE: Welcome email NOT sent (printed to terminal only)")
        print(f"To: {user.email}")
        print(f"Username: {user.username}")
        print(f"Generated Password: {password}")
        print(f"Subject: {subject}")
        print("\nTo actually send emails, set DEBUG=False in .env file")
        print(f"{'=' * 50}\n")
        return True

    # If DEBUG is False, try to send email
    try:
        # Check if email is configured
        if not getattr(settings, "EMAIL_HOST", None):
            print("ERROR: EMAIL_HOST is not configured in settings.py")
            print("Check email configuration in server/config/settings.py")
            return False

        print(f"PRODUCTION MODE: Attempting to send welcome email to {user.email}")

        send_mail(
            subject=subject,
            message=message,
            from_email=from_email,
            recipient_list=[user.email],
            fail_silently=False,
        )
        print(f"SUCCESS: Welcome email sent to {user.email}")
        print(f"From: {from_email}")
        print(f"Check spam folder if not received")
        return True

    except Exception as e:
        print(f"ERROR sending welcome email: {e}")
        print("Check email configuration:")
        print(f"1. EMAIL_HOST: {getattr(settings, 'EMAIL_HOST', 'NOT SET')}")
        print(f"2. EMAIL_HOST_USER: {getattr(settings, 'EMAIL_HOST_USER', 'NOT SET')}")
        print(f"3. Check .env file for EMAILHOSTUSERNAME and EMAILHOSTPASSWORD")
        return False
