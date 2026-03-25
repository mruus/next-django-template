from rest_framework import serializers

from core.models import User
from utils.defaults import RobustDateTimeField


class AssignableCustomPermissionsQuerySerializer(serializers.Serializer):
    group_id = serializers.IntegerField(required=False)
    user_id = serializers.UUIDField(required=False)

    def validate(self, attrs):
        has_group = attrs.get("group_id") is not None
        has_user = attrs.get("user_id") is not None
        if has_group and has_user:
            raise serializers.ValidationError(
                "Provide either group_id or user_id, not both."
            )
        if not has_group and not has_user:
            raise serializers.ValidationError(
                "Either group_id or user_id is required."
            )
        return attrs


class UserDirectPermissionsDeltaSerializer(serializers.Serializer):
    user_id = serializers.UUIDField()
    add_permission_ids = serializers.ListField(
        child=serializers.IntegerField(),
        required=False,
        default=list,
    )
    remove_permission_ids = serializers.ListField(
        child=serializers.IntegerField(),
        required=False,
        default=list,
    )

    def validate(self, attrs):
        add = attrs.get("add_permission_ids") or []
        remove = attrs.get("remove_permission_ids") or []
        if set(add) & set(remove):
            raise serializers.ValidationError(
                "add_permission_ids and remove_permission_ids must not overlap."
            )
        return attrs


class GroupPermissionsDeltaSerializer(serializers.Serializer):
    group_id = serializers.IntegerField()
    add_permission_ids = serializers.ListField(
        child=serializers.IntegerField(),
        required=False,
        default=list,
    )
    remove_permission_ids = serializers.ListField(
        child=serializers.IntegerField(),
        required=False,
        default=list,
    )

    def validate(self, attrs):
        add = attrs.get("add_permission_ids") or []
        remove = attrs.get("remove_permission_ids") or []
        if set(add) & set(remove):
            raise serializers.ValidationError(
                "add_permission_ids and remove_permission_ids must not overlap."
            )
        return attrs


class UserWithPermissionsSerializer(serializers.ModelSerializer):
    """
    Serializer for users with their permission information.
    Includes both direct permissions and group permissions.
    """

    created_at = RobustDateTimeField(read_only=True)
    updated_at = RobustDateTimeField(read_only=True)
    created_by_display = serializers.CharField(read_only=True)
    updated_by_display = serializers.CharField(read_only=True)
    avatar_url = serializers.SerializerMethodField()

    # Permission information
    direct_permissions = serializers.SerializerMethodField()
    group_permissions = serializers.SerializerMethodField()
    all_permissions = serializers.SerializerMethodField()
    groups = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "first_name",
            "last_name",
            "email",
            "gender",
            "status",
            "phone",
            "avatar",
            "avatar_url",
            "is_active",
            "is_deleted",
            "created_by",
            "created_by_display",
            "updated_by",
            "updated_by_display",
            "created_at",
            "updated_at",
            "direct_permissions",
            "group_permissions",
            "all_permissions",
            "groups",
        ]
        read_only_fields = [
            "id",
            "created_by",
            "updated_by",
            "created_at",
            "updated_at",
            "avatar_url",
            "direct_permissions",
            "group_permissions",
            "all_permissions",
            "groups",
        ]
        extra_kwargs = {"avatar": {"required": False, "allow_null": True}}

    def get_avatar_url(self, obj):
        if not obj.avatar:
            return None
        request = self.context.get("request")
        if request:
            return request.build_absolute_uri(obj.avatar.url)
        return obj.avatar.url

    def get_direct_permissions(self, obj):
        """Get direct permissions assigned to the user."""
        permissions = obj.user_permissions.all()
        return [
            {
                "id": perm.id,
                "name": perm.name,
                "codename": perm.codename,
                "content_type": {
                    "id": perm.content_type.id,
                    "app_label": perm.content_type.app_label,
                    "model": perm.content_type.model,
                },
            }
            for perm in permissions
        ]

    def get_group_permissions(self, obj):
        """Get permissions the user has through groups."""
        # Get all groups the user belongs to
        groups = obj.groups.all()
        group_permissions = []

        for group in groups:
            for perm in group.permissions.all():
                group_permissions.append(
                    {
                        "id": perm.id,
                        "name": perm.name,
                        "codename": perm.codename,
                        "content_type": {
                            "id": perm.content_type.id,
                            "app_label": perm.content_type.app_label,
                            "model": perm.content_type.model,
                        },
                        "group": {
                            "id": group.id,
                            "name": group.name,
                        },
                    }
                )

        return group_permissions

    def get_all_permissions(self, obj):
        """Get all permissions (direct + group) without duplicates."""
        direct_perms = self.get_direct_permissions(obj)
        group_perms = self.get_group_permissions(obj)

        # Combine and remove duplicates by permission id
        all_perms_dict = {}

        # Add direct permissions
        for perm in direct_perms:
            all_perms_dict[perm["id"]] = {**perm, "source": "direct"}

        # Add group permissions (overwrite if exists, but mark as from group)
        for perm in group_perms:
            perm_id = perm["id"]
            if perm_id in all_perms_dict:
                # If already exists, add group info to existing permission
                existing = all_perms_dict[perm_id]
                if "sources" not in existing:
                    existing["sources"] = [existing.get("source", "direct")]
                    del existing["source"]
                existing["sources"].append("group")
                if "groups" not in existing:
                    existing["groups"] = []
                existing["groups"].append(perm["group"])
            else:
                all_perms_dict[perm_id] = {
                    "id": perm["id"],
                    "name": perm["name"],
                    "codename": perm["codename"],
                    "content_type": perm["content_type"],
                    "sources": ["group"],
                    "groups": [perm["group"]],
                }

        return list(all_perms_dict.values())

    def get_groups(self, obj):
        """Get all groups the user belongs to."""
        groups = obj.groups.all()
        return [
            {
                "id": group.id,
                "name": group.name,
            }
            for group in groups
        ]
