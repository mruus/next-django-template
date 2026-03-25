from rest_framework.permissions import BasePermission

from utils.cache import get_user_permissions_list


class EffectiveCodenamePermission(BasePermission):
    message = "You do not have permission to perform this action."

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        effective = set(get_user_permissions_list(request.user))
        required = getattr(view, "required_codenames", None) or []
        if isinstance(required, str):
            required = [required]
        if not required:
            return True
        return all(c in effective for c in required)


class AssignableCustomPermissionsPermission(BasePermission):
    message = "You do not have permission to perform this action."

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        effective = set(get_user_permissions_list(request.user))
        group_id = request.query_params.get("group_id")
        user_id = request.query_params.get("user_id")
        codes = []
        if group_id not in (None, ""):
            codes.append("change_group")
        if user_id not in (None, ""):
            codes.append("add_permission")
        if not codes:
            return False
        return all(c in effective for c in codes)
