"""
Authentication flow service for handling complete authentication workflows.

This service handles the complete authentication flows, moving condition checks
and business logic out of views and into dedicated services.
"""

from typing import Any, Dict

from rest_framework import status
from rest_framework.response import Response

from utils.defaults import APIResponse, flatten_errors

from ..utils import handle_login_flow, handle_otp_verification
from .form import FormValidationService

# TokenService is imported in utils module that we use


class AuthFlowService:
    """Service for authentication flow logic."""

    @staticmethod
    def handle_login_request(request_data: Dict[str, Any], serializer_class) -> Response:
        """
        Handle complete login request flow.

        Args:
            request_data: Request data dictionary
            serializer_class: Serializer class to use

        Returns:
            Response: Django REST Framework response
        """
        # Create serializer instance
        serializer = serializer_class(data=request_data)

        # Validate serializer (basic field validation)
        if not serializer.is_valid():
            errors = flatten_errors(serializer.errors)
            return APIResponse.error(errors)

        # Extract data for business logic validation
        email = serializer.validated_data.get('email')
        password = serializer.validated_data.get('password')

        # Device info should come from request.META via extract_device_info_from_request
        # These fields are now optional in serializer since they come from request
        device_id = serializer.validated_data.get('device_id')
        user_agent = serializer.validated_data.get('user_agent', '')
        ip_address = serializer.validated_data.get('ip_address')
        device_name = serializer.validated_data.get('device_name', 'Unknown Device')

        # Business logic validation using FormValidationService
        validation_result = FormValidationService.validate_login_form(
            email=email,
            password=password,
            device_id=device_id,
            user_agent=user_agent,
            ip_address=ip_address,
            device_name=device_name
        )

        if not validation_result['is_valid']:
            errors = flatten_errors(validation_result['errors'])
            return APIResponse.error(errors)

        # Extract validated data from FormValidationService result
        user = validation_result['user']

        # Handle login flow using utility function
        response_data = handle_login_flow(
            user=user,
            device_id=device_id,
            user_agent=user_agent,
            ip_address=ip_address,
            device_name=device_name
        )

        # Create appropriate response based on OTP requirement
        return AuthFlowService._create_login_response(response_data)

    @staticmethod
    def handle_otp_verification_request(request_data: Dict[str, Any], serializer_class) -> Response:
        """
        Handle complete OTP verification request flow.

        Args:
            request_data: Request data dictionary
            serializer_class: Serializer class to use

        Returns:
            Response: Django REST Framework response
        """
        # Create serializer instance
        serializer = serializer_class(data=request_data)

        # Validate serializer (basic field validation)
        if not serializer.is_valid():
            errors = flatten_errors(serializer.errors)
            return APIResponse.error(errors)

        # Extract data for business logic validation
        email = serializer.validated_data.get('email')
        otp_code = serializer.validated_data.get('otp_code')

        # Device info should come from request.META via extract_device_info_from_request
        # These fields are now optional in serializer since they come from request
        device_id = serializer.validated_data.get('device_id')
        remember_device = serializer.validated_data.get('remember_device', False)
        device_name = serializer.validated_data.get('device_name')

        # Note: We skip FormValidationService validation here because
        # handle_otp_verification will validate the OTP and return errors
        # in the proper APIResponse format through _create_otp_verification_response

        # Handle OTP verification using utility function
        # This will validate OTP and handle device trust
        success, response_data, error_message = handle_otp_verification(
            email=email,
            otp_code=otp_code,
            device_id=device_id,
            remember_device=remember_device,
            device_name=device_name
        )

        # Create appropriate response based on verification result
        # Ensure error_message is a string
        error_msg = str(error_message) if error_message else "Verification failed"
        return AuthFlowService._create_otp_verification_response(
            success, response_data or {}, error_msg
        )

    @staticmethod
    def _create_login_response(response_data: Dict[str, Any]) -> Response:
        """
        Create appropriate login response based on OTP requirement.

        Args:
            response_data: Response data from handle_login_flow

        Returns:
            Response: Django REST Framework response
        """
        from ..serializers import OTPResponseSerializer, TokenResponseSerializer

        # Choose serializer based on OTP requirement
        if response_data.get('requires_otp'):
            response_serializer = OTPResponseSerializer(data=response_data)
        else:
            response_serializer = TokenResponseSerializer(data=response_data)

        # Validate response serializer
        if not response_serializer.is_valid():
            errors = flatten_errors(response_serializer.errors)
            return APIResponse.error(errors)

        # Return response
        return Response(
            response_serializer.data,
            status=status.HTTP_200_OK
        )

    @staticmethod
    def _create_otp_verification_response(success: bool, response_data: Dict[str, Any], error_message: str) -> Response:
        """
        Create appropriate OTP verification response.

        Args:
            success: Whether verification was successful
            response_data: Response data if successful
            error_message: Error message if failed

        Returns:
            Response: Django REST Framework response
        """
        from ..serializers import TokenResponseSerializer

        if not success:
            return APIResponse.error(error_message)

        # Create token response
        response_serializer = TokenResponseSerializer(data=response_data)
        if not response_serializer.is_valid():
            errors = flatten_errors(response_serializer.errors)
            return APIResponse.error(errors)

        return Response(
            response_serializer.data,
            status=status.HTTP_200_OK
        )

    @staticmethod
    def validate_and_process_login(email: str, password: str, device_id: str, **kwargs) -> Dict[str, Any]:
        """
        Validate login credentials and process login flow.

        Args:
            email: User email
            password: Password
            device_id: Device identifier
            **kwargs: Additional parameters (user_agent, ip_address, device_name)

        Returns:
            dict: Login result with status and data
        """
        # Validate form data
        validation_result = FormValidationService.validate_login_form(
            email=email,
            password=password,
            device_id=device_id,
            user_agent=kwargs.get('user_agent', ''),
            ip_address=kwargs.get('ip_address'),
            device_name=kwargs.get('device_name', 'Unknown Device')
        )

        if not validation_result['is_valid']:
            return {
                'success': False,
                'errors': validation_result['errors'],
                'status_code': status.HTTP_400_BAD_REQUEST
            }

        # Process login flow
        user = validation_result['user']
        response_data = handle_login_flow(
            user=user,
            device_id=device_id,
            user_agent=kwargs.get('user_agent', ''),
            ip_address=kwargs.get('ip_address'),
            device_name=kwargs.get('device_name', 'Unknown Device')
        )

        return {
            'success': True,
            'data': response_data,
            'status_code': status.HTTP_200_OK
        }

    @staticmethod
    def validate_and_process_otp(email: str, otp_code: str, device_id: str, **kwargs) -> Dict[str, Any]:
        """
        Validate OTP and process verification flow.

        Args:
            email: User email
            otp_code: OTP code
            device_id: Device identifier
            **kwargs: Additional parameters (remember_device, device_name)

        Returns:
            dict: OTP verification result with status and data
        """
        # Validate form data
        validation_result = FormValidationService.validate_otp_verification_form(
            email=email,
            otp_code=otp_code,
            device_id=device_id,
            remember_device=kwargs.get('remember_device', True),
            device_name=kwargs.get('device_name', 'Unknown Device')
        )

        if not validation_result['is_valid']:
            return {
                'success': False,
                'errors': validation_result['errors'],
                'status_code': status.HTTP_400_BAD_REQUEST
            }

        # Process OTP verification
        success, response_data, error_message = handle_otp_verification(
            email=email,
            otp_code=otp_code,
            device_id=device_id,
            remember_device=kwargs.get('remember_device', False),
            device_name=kwargs.get('device_name')
        )

        if not success:
            return {
                'success': False,
                'error': error_message,
                'status_code': status.HTTP_400_BAD_REQUEST
            }

        return {
            'success': True,
            'data': response_data,
            'status_code': status.HTTP_200_OK
        }
