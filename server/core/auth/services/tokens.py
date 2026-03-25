"""
Token service for JWT token management.
"""

from rest_framework_simplejwt.tokens import RefreshToken

from core.models import User


class TokenService:
    """Service for token-related operations."""

    @staticmethod
    def generate_tokens(user):
        """
        Generate JWT tokens for a user.

        Args:
            user: User instance

        Returns:
            dict: Tokens with user info
        """
        refresh = RefreshToken.for_user(user)

        # Add custom claims
        refresh['user_id'] = str(user.id)
        refresh['email'] = user.email
        refresh['first_name'] = user.first_name
        refresh['last_name'] = user.last_name

        return {
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'user_id': user.id,
            'email': user.email,
            'first_name': user.first_name,
            'last_name': user.last_name,
        }

    @staticmethod
    def refresh_access_token(refresh_token):
        """
        Refresh an access token.

        Args:
            refresh_token: JWT refresh token

        Returns:
            dict: New access token or error
        """
        try:
            refresh = RefreshToken(refresh_token)
            access_token = str(refresh.access_token)

            return {
                'access': access_token,
                'success': True
            }
        except Exception as e:
            return {
                'error': str(e),
                'success': False
            }

    @staticmethod
    def verify_token(token):
        """
        Verify if a token is valid.

        Args:
            token: JWT token to verify

        Returns:
            dict: Verification result
        """
        try:
            # Try to decode the token
            from rest_framework_simplejwt.tokens import AccessToken
            AccessToken(token)
            return {
                'valid': True,
                'success': True
            }
        except Exception as e:
            return {
                'valid': False,
                'error': str(e),
                'success': False
            }

    @staticmethod
    def get_user_from_token(token):
        """
        Get user from a valid token.

        Args:
            token: JWT access token

        Returns:
            tuple: (user, error_message)
        """
        try:
            from rest_framework_simplejwt.tokens import AccessToken
            access_token = AccessToken(token)

            # Get user ID from token
            user_id = access_token.get('user_id')
            if not user_id:
                return None, "No user ID in token"

            # Get user
            try:
                user = User.objects.get(id=user_id)
                return user, None
            except User.DoesNotExist:
                return None, "User not found"

        except Exception as e:
            return None, str(e)

    @staticmethod
    def create_token_response(tokens, requires_otp=False, message=""):
        """
        Create a standardized token response.

        Args:
            tokens: Token dictionary from generate_tokens
            requires_otp: Whether OTP is required
            message: Response message

        Returns:
            dict: Standardized response
        """
        return {
            'access': tokens['access'],
            'refresh': tokens['refresh'],
            'user_id': tokens['user_id'],
            'email': tokens['email'],
            'first_name': tokens['first_name'],
            'last_name': tokens['last_name'],
            'requires_otp': requires_otp,
            'message': message,
        }

    @staticmethod
    def create_otp_response(user, message="OTP sent to your email"):
        """
        Create a standardized OTP response.

        Args:
            user: User instance
            message: Response message

        Returns:
            dict: Standardized OTP response
        """
        return {
            'requires_otp': True,
            'message': message,
            'user_id': user.id,
            'email': user.email,
        }

    @staticmethod
    def blacklist_token(refresh_token):
        """
        Blacklist a refresh token.

        Args:
            refresh_token: JWT refresh token to blacklist

        Returns:
            dict: Blacklist result
        """
        try:
            refresh = RefreshToken(refresh_token)
            refresh.blacklist()
            return {
                'success': True,
                'message': 'Token blacklisted successfully'
            }
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
