"""
App and model registry for permission mapping.
This provides a centralized registry of all Django apps and models
that can have permissions associated with them.
"""

from django.apps import apps
from django.contrib.contenttypes.models import ContentType

# Manual registry of apps and models for permission mapping
# This can be extended as new apps/models are added
APPS_MODELS_REGISTRY = {
    "core": [
        "User",
        "CustomPermissions",
        "TrustedDevice",
        "OTP",
    ],
    "personnel": [
        "Label",
        "Qualification",
        "Banks",
        "ContractTypes",
        "Ranks",
        "PayScale",
        "Allowances",
        "JobTitles",
        "BattalionTree",
        "Tribes",
        "Locations",
    ],
}


def get_all_apps_models():
    """
    Get all available apps and models from Django.
    Returns a dictionary of {app_label: [model_names]}.
    """
    all_models = {}
    for app_config in apps.get_app_configs():
        app_label = app_config.label
        # Skip Django built-in apps
        if app_label in ["admin", "auth", "contenttypes", "sessions"]:
            continue

        model_names = []
        for model in app_config.get_models():
            model_names.append(model.__name__)

        if model_names:
            all_models[app_label] = model_names

    return all_models


def get_content_type_id(app_label, model):
    """
    Get ContentType ID for a given app_label and model.
    Returns None if not found.
    """
    try:
        content_type = ContentType.objects.get(app_label=app_label, model=model.lower())
        return content_type.id
    except ContentType.DoesNotExist:
        return None


def get_suggested_codename_from_href(href):
    """
    Generate suggested permission codename from menu href.
    Examples:
      /settings/tribes -> view_tribe
      /settings/locations -> view_location
      /personnel/create -> add_personnel
    """
    if not href or href == "#":
        return ""

    # Remove leading slash and split
    path = href.strip("/")
    parts = path.split("/")

    if len(parts) >= 2:
        # Handle patterns like /settings/tribes
        resource = parts[-1]
        action = parts[-2] if len(parts) >= 2 else "view"

        # Map common actions to permission types
        action_map = {
            "create": "add",
            "add": "add",
            "edit": "change",
            "update": "change",
            "delete": "delete",
            "list": "view",
            "": "view",
        }

        permission_action = action_map.get(action, "view")

        # Convert resource to singular if needed
        # Simple plural to singular conversion
        if resource.endswith("ies"):
            singular = resource[:-3] + "y"
        elif resource.endswith("es"):
            singular = resource[:-2]
        elif resource.endswith("s"):
            singular = resource[:-1]
        else:
            singular = resource

        # Convert kebab-case to snake_case
        singular = singular.replace("-", "_")

        return f"{permission_action}_{singular}"

    return ""


def get_suggested_app_model_from_href(href):
    """
    Suggest app and model based on href pattern.
    Returns tuple (app_label, model_name) or (None, None).
    """
    if not href:
        return None, None

    path = href.strip("/")
    parts = path.split("/")

    if len(parts) >= 2:
        resource = parts[-1]

        # Map common resources to apps/models
        resource_map = {
            "tribes": ("personnel", "Tribes"),
            "locations": ("personnel", "Locations"),
            "labels": ("personnel", "Label"),
            "qualifications": ("personnel", "Qualification"),
            "banks": ("personnel", "Banks"),
            "battalion-tree": ("personnel", "BattalionTree"),
            "job-titles": ("personnel", "JobTitles"),
            "ranks": ("personnel", "Ranks"),
            "payScale": ("personnel", "PayScale"),
            "contract-types": ("personnel", "ContractTypes"),
            "allowances": ("personnel", "Allowances"),
            "users": ("core", "User"),
            "permissions": ("core", "CustomPermissions"),
        }

        # Try exact match first
        if resource in resource_map:
            return resource_map[resource]

        # Try with singular conversion
        if resource.endswith("s"):
            singular = resource[:-1]
            if singular in resource_map:
                return resource_map[singular]

    return None, None
