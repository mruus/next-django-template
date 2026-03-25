import secrets
import string

from rest_framework import serializers

from core.models import User
from utils.defaults import RobustDateTimeField
from utils.email import send_welcome_email


class UserSearchHitSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "username", "first_name", "last_name", "email"]


class UserGroupsDeltaSerializer(serializers.Serializer):
    add_group_ids = serializers.ListField(
        child=serializers.IntegerField(),
        required=False,
        default=list,
    )
    remove_group_ids = serializers.ListField(
        child=serializers.IntegerField(),
        required=False,
        default=list,
    )

    def validate(self, attrs):
        add = attrs.get("add_group_ids") or []
        remove = attrs.get("remove_group_ids") or []
        if set(add) & set(remove):
            raise serializers.ValidationError(
                "add_group_ids and remove_group_ids must not overlap."
            )
        return attrs


class UserSerializer(serializers.ModelSerializer):
    created_at = RobustDateTimeField(read_only=True)
    updated_at = RobustDateTimeField(read_only=True)
    created_by_display = serializers.CharField(read_only=True)
    updated_by_display = serializers.CharField(read_only=True)
    avatar_url = serializers.SerializerMethodField()
    password = serializers.CharField(write_only=True, required=False, allow_blank=True)

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
            "password",
        ]
        read_only_fields = [
            "id",
            "created_by",
            "updated_by",
            "created_at",
            "updated_at",
            "avatar_url",
        ]
        extra_kwargs = {"avatar": {"required": False, "allow_null": True}}

    def get_avatar_url(self, obj):
        if not obj.avatar:
            return None
        request = self.context.get("request")
        if request:
            return request.build_absolute_uri(obj.avatar.url)
        return obj.avatar.url

    def create(self, validated_data):
        password = validated_data.pop("password", None)

        # Generate random password if not provided
        if not password:
            alphabet = string.ascii_letters + string.digits + "!@#$%^&*"
            password = "".join(secrets.choice(alphabet) for _ in range(12))

        user = super().create(validated_data)
        user.set_password(password)
        user.save()

        # Send welcome email with credentials
        send_welcome_email(user, password)

        return user

    def update(self, instance, validated_data):
        password = validated_data.pop("password", None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if password:
            instance.set_password(password)
        instance.save()
        return instance
