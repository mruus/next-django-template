import importlib
import os
import sys

import django

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

CustomPermissions = importlib.import_module("core.models").CustomPermissions
Permission = importlib.import_module("django.contrib.auth.models").Permission
ContentType = importlib.import_module("django.contrib.contenttypes.models").ContentType


menus = {
    "personnel": {
        "name": "Personnel",
        "app_label": "personnel",
        "model": "label",
        "permissions": [
            {
                "name": "View Personnel Dashboard",
                "codename": "view_personnel_dashboard",
            },
            {"name": "Export All Personnel Data", "codename": "export_personnel_full"},
        ],
        "settings": {
            "name": "Settings",
            "permissions": [],
            "tribes": {
                "name": "Tribes",
                "app_label": "personnel",
                "model": "tribes",
                "permissions": [
                    {"name": "View Tribe", "codename": "view_tribes"},
                    {"name": "Add Tribe", "codename": "add_tribes"},
                    {"name": "Edit Tribe", "codename": "change_tribes"},
                    {"name": "Delete Tribe", "codename": "delete_tribes"},
                    {"name": "Export Tribe", "codename": "export_tribes"},
                ],
            },
            "locations": {
                "name": "Locations",
                "app_label": "personnel",
                "model": "locations",
                "permissions": [
                    {"name": "View Location", "codename": "view_locations"},
                    {"name": "Add Location", "codename": "add_locations"},
                    {"name": "Edit Location", "codename": "change_locations"},
                    {"name": "Delete Location", "codename": "delete_locations"},
                ],
            },
            "labels": {
                "name": "Labels",
                "app_label": "personnel",
                "model": "label",
                "permissions": [
                    {"name": "View Label", "codename": "view_label"},
                    {"name": "Add Label", "codename": "add_label"},
                    {"name": "Edit Label", "codename": "change_label"},
                    {"name": "Delete Label", "codename": "delete_label"},
                ],
            },
            "qualifications": {
                "name": "Qualifications",
                "app_label": "personnel",
                "model": "qualification",
                "permissions": [
                    {"name": "View Qualification", "codename": "view_qualification"},
                    {"name": "Add Qualification", "codename": "add_qualification"},
                    {"name": "Edit Qualification", "codename": "change_qualification"},
                    {
                        "name": "Delete Qualification",
                        "codename": "delete_qualification",
                    },
                ],
            },
            "banks": {
                "name": "Banks",
                "app_label": "personnel",
                "model": "banks",
                "permissions": [
                    {"name": "View Bank", "codename": "view_banks"},
                    {"name": "Add Bank", "codename": "add_banks"},
                    {"name": "Edit Bank", "codename": "change_banks"},
                    {"name": "Delete Bank", "codename": "delete_banks"},
                ],
            },
            "battalionTree": {
                "name": "Battalion Tree",
                "app_label": "personnel",
                "model": "battaliontree",
                "permissions": [
                    {"name": "View Battalion Tree", "codename": "view_battaliontree"},
                    {"name": "Add Battalion Tree", "codename": "add_battaliontree"},
                    {"name": "Edit Battalion Tree", "codename": "change_battaliontree"},
                    {
                        "name": "Delete Battalion Tree",
                        "codename": "delete_battaliontree",
                    },
                ],
            },
            "jobTitles": {
                "name": "Job Titles",
                "app_label": "personnel",
                "model": "jobtitles",
                "permissions": [
                    {"name": "View Job Title", "codename": "view_jobtitles"},
                    {"name": "Add Job Title", "codename": "add_jobtitles"},
                    {"name": "Edit Job Title", "codename": "change_jobtitles"},
                    {"name": "Delete Job Title", "codename": "delete_jobtitles"},
                ],
            },
            "ranks": {
                "name": "Ranks",
                "app_label": "personnel",
                "model": "ranks",
                "permissions": [
                    {"name": "View Rank", "codename": "view_ranks"},
                    {"name": "Add Rank", "codename": "add_ranks"},
                    {"name": "Edit Rank", "codename": "change_ranks"},
                    {"name": "Delete Rank", "codename": "delete_ranks"},
                ],
            },
            "payScale": {
                "name": "Pay Scale",
                "app_label": "personnel",
                "model": "payscale",
                "permissions": [
                    {"name": "View Pay Scale", "codename": "view_payscale"},
                    {"name": "Add Pay Scale", "codename": "add_payscale"},
                    {"name": "Edit Pay Scale", "codename": "change_payscale"},
                    {"name": "Delete Pay Scale", "codename": "delete_payscale"},
                ],
            },
            "contractTypes": {
                "name": "Contract Types",
                "app_label": "personnel",
                "model": "contracttypes",
                "permissions": [
                    {"name": "View Contract Type", "codename": "view_contracttypes"},
                    {"name": "Add Contract Type", "codename": "add_contracttypes"},
                    {"name": "Edit Contract Type", "codename": "change_contracttypes"},
                    {
                        "name": "Delete Contract Type",
                        "codename": "delete_contracttypes",
                    },
                ],
            },
            "allowances": {
                "name": "Allowances",
                "app_label": "personnel",
                "model": "allowances",
                "permissions": [
                    {"name": "View Allowance", "codename": "view_allowances"},
                    {"name": "Add Allowance", "codename": "add_allowances"},
                    {"name": "Edit Allowance", "codename": "change_allowances"},
                    {"name": "Delete Allowance", "codename": "delete_allowances"},
                ],
            },
        },
    },
    "finance": {
        "name": "Finance",
        "permissions": [],
    },
    "logistics": {
        "name": "Logistics",
        "permissions": [],
    },
    "administration": {
        "name": "Administration",
        "permissions": [],
        "users": {
            "name": "Users",
            "app_label": "core",
            "model": "user",
            "permissions": [
                {"name": "View User", "codename": "view_user"},
                {"name": "Add User", "codename": "add_user"},
                {"name": "Edit User", "codename": "change_user"},
                {"name": "Delete User", "codename": "delete_user"},
            ],
        },
        "access_control": {
            "name": "Access Control",
            "app_label": "auth",
            "model": "",
            "permissions": [],
            "groups": {
                "name": "Groups",
                "app_label": "auth",
                "model": "group",
                "permissions": [
                    {"name": "View Group", "codename": "view_group"},
                    {"name": "Add Group", "codename": "add_group"},
                    {"name": "Edit Group", "codename": "change_group"},
                    {"name": "Delete Group", "codename": "delete_group"},
                ],
            },
            "Permissions": {
                "name": "Permissions",
                "app_label": "auth",
                "model": "permission",
                "permissions": [
                    {"name": "View Permission", "codename": "view_permission"},
                    {"name": "Add Permission", "codename": "add_permission"},
                    {"name": "Edit Permission", "codename": "change_permission"},
                    {"name": "Delete Permission", "codename": "delete_permission"},
                ],
            },
            "sync": {
                "name": "Sync",
                "app_label": "core",
                "model": "custompermissions",
                "permissions": [
                    {"name": "View Sync", "codename": "view_custompermissions"},
                    {"name": "Add Sync", "codename": "add_custompermissions"},
                    {"name": "Edit Sync", "codename": "change_custompermissions"},
                    {"name": "Delete Sync", "codename": "delete_custompermissions"},
                ],
            },
        },
    },
}


def get_or_create_permission(app_label: str, model: str, codename: str, name: str):
    ct, _ = ContentType.objects.get_or_create(app_label=app_label, model=model.lower())
    perm, created = Permission.objects.get_or_create(
        content_type=ct, codename=codename, defaults={"name": name}
    )
    if not created and perm.name != name:
        perm.name = name
        perm.save(update_fields=["name"])
    return perm


def get_or_create_group_node(parent, name: str):
    node = (
        CustomPermissions.objects.filter(
            is_deleted=False,
            name=name,
            codename__isnull=True,
            permission__isnull=True,
            tn_parent=parent,
        )
        .order_by("tn_level", "tn_order")
        .first()
    )
    if node:
        return node

    return CustomPermissions.objects.create(
        name=name,
        name_en=name,
        name_ar=name,
        name_so=name,
        codename=None,
        permission=None,
        tn_parent=parent,
    )


def get_or_create_permission_node(parent, name: str, codename: str, permission):
    node = (
        CustomPermissions.objects.filter(
            is_deleted=False,
            codename=codename,
            permission=permission,
            tn_parent=parent,
        )
        .order_by("tn_level", "tn_order")
        .first()
    )
    if node:
        if node.name != name:
            node.name = name
            node.save(update_fields=["name"])
        return node

    return CustomPermissions.objects.create(
        name=name,
        name_en=name,
        name_ar=name,
        name_so=name,
        codename=codename,
        permission=permission,
        tn_parent=parent,
    )


def process_menus(parent_node, node_name: str, node_value):
    # ── Get display name (fallback to key if missing)
    display_name = node_value.get("name", node_name)

    # ── 1. Create or get the group/folder node
    group_node = get_or_create_group_node(parent_node, display_name)

    # ── 2. Handle permissions based on whether this is a model-based node or custom permissions node
    if "app_label" in node_value and "model" in node_value:
        # Model-based permissions
        app_label = node_value["app_label"]
        model = node_value["model"].lower()

        for perm_dict in node_value.get("permissions", []):
            perm_name = perm_dict.get("name") or perm_dict.get("codename", "")
            codename = perm_dict.get("codename")
            if not codename:
                continue

            permission = get_or_create_permission(
                app_label=app_label,
                model=model,
                codename=codename,
                name=perm_name,
            )
            get_or_create_permission_node(
                parent=group_node,
                name=perm_name,
                codename=permission.codename,
                permission=permission,
            )
    else:
        # Custom (non-model) permissions
        for perm_dict in node_value.get("permissions", []):
            perm_name = perm_dict.get("name") or perm_dict.get("codename", "Unnamed")
            codename = perm_dict.get("codename")

            if not codename:
                continue

            # For custom (non-model) permissions we can use a dummy/fake content_type
            # or your project probably already has a convention → here using "core | custompermission"
            ct, _ = ContentType.objects.get_or_create(
                app_label="core", model="custompermission"
            )

            permission, _ = Permission.objects.get_or_create(
                content_type=ct, codename=codename, defaults={"name": perm_name}
            )
            if permission.name != perm_name:
                permission.name = perm_name
                permission.save(update_fields=["name"])

            get_or_create_permission_node(
                parent=group_node,
                name=perm_name,
                codename=codename,
                permission=permission,
            )

    # ── 3. Recurse into children
    for child_key, child_value in node_value.items():
        # Skip keys we already processed
        if child_key in {"name", "permissions", "app_label", "model"}:
            continue
        process_menus(group_node, child_key, child_value)

    return group_node


def run_bulk_permissions():
    for root_name, root_value in menus.items():
        process_menus(parent_node=None, node_name=root_name, node_value=root_value)


if __name__ == "__main__":
    run_bulk_permissions()
