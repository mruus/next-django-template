"""
Sync service for menu-permissions synchronization.
Handles the synchronization between menu structure and CustomPermissions.
"""

from typing import Any, Dict, List, Optional

from django.contrib.auth.models import Permission
from django.db import transaction
from django.utils.text import slugify

from core.models import CustomPermissions

from .menu_parser import menu_parser
from .registry import (
    get_suggested_app_model_from_href,
    get_suggested_codename_from_href,
)
from .service import permission_service


class MenuSyncService:
    """Service for synchronizing menu structure with CustomPermissions."""

    def get_sync_preview(self) -> Dict[str, Any]:
        """
        Get preview of menu sync with current state.

        Returns:
            Dictionary with menu structure, current mappings, and suggestions
        """
        # Get menu structure with translations
        menu_data = menu_parser.get_menu_structure()
        if not menu_data["success"]:
            return {
                "success": False,
                "error": menu_data.get("error", "Failed to parse menu"),
            }

        # Get current CustomPermissions tree
        current_permissions = self._get_current_custom_permissions_tree()

        # Build preview structure
        preview = self._build_preview_structure(
            menu_data["menu_hierarchy"], current_permissions
        )

        return {
            "success": True,
            "preview": preview,
            "menu_hierarchy": menu_data["menu_hierarchy"],
            "current_permissions": current_permissions,
            "stats": self._calculate_preview_stats(preview),
        }

    def _get_current_custom_permissions_tree(self) -> List[Dict[str, Any]]:
        """
        Get current CustomPermissions as a tree structure.

        Returns:
            List of root nodes with children
        """
        # Get all CustomPermissions ordered for tree building
        all_perms = (
            CustomPermissions.objects.all()
            .select_related("permission", "permission__content_type")
            .order_by("tn_level", "tn_order")
        )

        # Build tree structure
        nodes_by_id = {}
        root_nodes = []

        # First pass: create all nodes
        for perm in all_perms:
            node = {
                "id": str(perm.id),
                "type": "custom_permission",
                "name": perm.name,
                "codename": perm.codename,
                "permission_id": perm.permission_id,
                "permission": (
                    {
                        "id": perm.permission.id,
                        "name": perm.permission.name,
                        "codename": perm.permission.codename,
                        "content_type": {
                            "id": perm.permission.content_type.id,
                            "app_label": perm.permission.content_type.app_label,
                            "model": perm.permission.content_type.model,
                        },
                    }
                    if perm.permission
                    else None
                ),
                "tn_parent_id": perm.tn_parent_id,
                "tn_level": perm.tn_level,
                "tn_order": perm.tn_order,
                "children": [],
            }
            nodes_by_id[perm.id] = node

        # Second pass: build hierarchy
        for perm in all_perms:
            node = nodes_by_id[perm.id]
            if perm.tn_parent_id:
                parent_node = nodes_by_id.get(perm.tn_parent_id)
                if parent_node:
                    parent_node["children"].append(node)
            else:
                root_nodes.append(node)

        return root_nodes

    def _build_preview_structure(
        self,
        menu_hierarchy: List[Dict[str, Any]],
        current_permissions: List[Dict[str, Any]],
    ) -> List[Dict[str, Any]]:
        """
        Build preview structure comparing menu with current permissions.

        Args:
            menu_hierarchy: Menu structure from TypeScript
            current_permissions: Current CustomPermissions tree

        Returns:
            Preview structure with comparison data
        """
        # Create mapping of current permissions by key
        current_by_key = {}
        self._index_current_permissions(current_permissions, current_by_key)

        # Build preview from menu hierarchy
        preview_nodes = []
        for menu_node in menu_hierarchy:
            preview_node = self._build_preview_node(menu_node, current_by_key)
            preview_nodes.append(preview_node)

        return preview_nodes

    def _index_current_permissions(
        self,
        nodes: List[Dict[str, Any]],
        index: Dict[str, Dict[str, Any]],
        parent_path: str = "",
    ) -> None:
        """
        Index current permissions by their path/key.

        Args:
            nodes: Current permission nodes
            index: Dictionary to populate
            parent_path: Current path for hierarchy
        """
        for node in nodes:
            # Create key from name and hierarchy
            node_name = node.get("name", "").strip()
            if node_name:
                # Use English translation key if available in name
                key = slugify(node_name).replace("-", "_")
                if parent_path:
                    key = f"{parent_path}.{key}"

                index[key] = node

                # Index children recursively
                if node.get("children"):
                    self._index_current_permissions(node["children"], index, key)

    def _build_preview_node(
        self, menu_node: Dict[str, Any], current_by_key: Dict[str, Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Build a preview node from menu node.

        Args:
            menu_node: Menu node from TypeScript
            current_by_key: Index of current permissions

        Returns:
            Preview node with comparison data
        """
        node_type = menu_node.get("type", "")
        title_key = menu_node.get("title_key", "")
        href = menu_node.get("href", "")

        # Generate node key
        node_key = slugify(title_key).replace("-", "_") if title_key else ""

        # Find matching current permission
        current_match = current_by_key.get(node_key)

        # Build preview node
        preview_node = {
            "id": menu_node.get("id", ""),
            "type": node_type,
            "title_key": title_key,
            "title": menu_node.get("title", title_key),
            "href": href,
            "has_children": bool(menu_node.get("children")),
            "status": "new",  # new, existing, modified
            "current_permission": None,
            "suggestions": {},
        }

        # Add translations if available
        if "translations" in menu_node:
            preview_node["translations"] = menu_node["translations"]

        # Check if this is a leaf node that needs permission
        needs_permission = node_type in ["menu", "child"] and href and href != "#"

        if needs_permission:
            # Generate suggestions
            suggested_codename = get_suggested_codename_from_href(href)
            suggested_app, suggested_model = get_suggested_app_model_from_href(href)

            preview_node["suggestions"] = {
                "codename": suggested_codename,
                "app_label": suggested_app,
                "model": suggested_model,
            }

            # Search for existing Django permission
            if suggested_codename:
                existing_perm = permission_service.get_permission_by_codename(
                    suggested_codename
                )
                if existing_perm:
                    preview_node["suggestions"]["existing_permission"] = existing_perm

        # Check if we have a current match
        if current_match:
            preview_node["status"] = "existing"
            preview_node["current_permission"] = current_match

            # Check if modification is needed
            if needs_permission and not current_match.get("permission"):
                preview_node["status"] = "modified"

        # Handle children recursively
        if menu_node.get("children"):
            preview_node["children"] = []
            for child in menu_node["children"]:
                child_preview = self._build_preview_node(child, current_by_key)
                preview_node["children"].append(child_preview)

        return preview_node

    def _calculate_preview_stats(
        self, preview_nodes: List[Dict[str, Any]]
    ) -> Dict[str, int]:
        """
        Calculate statistics for preview.

        Args:
            preview_nodes: Preview structure

        Returns:
            Dictionary with counts
        """
        stats = {
            "total": 0,
            "new": 0,
            "existing": 0,
            "modified": 0,
            "needs_permission": 0,
        }

        def count_nodes(nodes):
            for node in nodes:
                stats["total"] += 1
                stats[node["status"]] += 1

                # Check if needs permission
                if (
                    node["type"] in ["menu", "child"]
                    and node.get("href")
                    and node["href"] != "#"
                ):
                    stats["needs_permission"] += 1

                # Count children
                if node.get("children"):
                    count_nodes(node["children"])

        count_nodes(preview_nodes)
        return stats

    def execute_sync(
        self, mappings: Dict[str, Dict[str, Any]], dry_run: bool = False
    ) -> Dict[str, Any]:
        """
        Execute menu-permissions synchronization.

        Args:
            mappings: Dictionary mapping menu IDs to permission data
                {
                    "menu_id": {
                        "permission_id": 123,  # Existing permission ID
                        "or_create": {  # Or create new permission
                            "name": "Permission Name",
                            "codename": "view_model",
                            "app_label": "app",
                            "model": "Model",
                        }
                    }
                }
            dry_run: If True, only preview changes without saving

        Returns:
            Dictionary with sync results
        """
        # Get menu structure
        menu_data = menu_parser.get_menu_structure()
        if not menu_data["success"]:
            return {
                "success": False,
                "error": menu_data.get("error", "Failed to parse menu"),
                "dry_run": dry_run,
            }

        # Prepare sync plan
        sync_plan = self._prepare_sync_plan(menu_data["menu_hierarchy"], mappings)

        if dry_run:
            return {
                "success": True,
                "dry_run": True,
                "sync_plan": sync_plan,
                "changes": self._summarize_changes(sync_plan),
            }

        # Execute sync
        try:
            with transaction.atomic():
                results = self._execute_sync_plan(sync_plan)

            return {
                "success": True,
                "dry_run": False,
                "results": results,
                "changes": self._summarize_changes(sync_plan),
            }

        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "dry_run": False,
            }

    def _prepare_sync_plan(
        self, menu_hierarchy: List[Dict[str, Any]], mappings: Dict[str, Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Prepare detailed sync plan.

        Args:
            menu_hierarchy: Menu structure
            mappings: User-provided mappings

        Returns:
            Detailed sync plan
        """
        sync_plan = {
            "nodes_to_create": [],
            "nodes_to_update": [],
            "permissions_to_create": [],
            "hierarchy": [],
        }

        # Process menu hierarchy
        def process_node(node, parent_id=None, level=0, order=0):
            node_id = node.get("id")
            node_type = node.get("type")
            title_key = node.get("title_key")
            href = node.get("href")

            # Get user mapping for this node
            user_mapping = mappings.get(node_id, {})

            # Determine permission data
            permission_data = None
            permission_to_create = None

            if node_type in ["menu", "child"] and href and href != "#":
                # This node needs a permission
                if "permission_id" in user_mapping:
                    # Use existing permission
                    permission_data = {
                        "permission_id": user_mapping["permission_id"],
                    }
                elif "or_create" in user_mapping:
                    # Create new permission
                    create_data = user_mapping["or_create"]
                    permission_to_create = {
                        "name": create_data.get("name", title_key),
                        "codename": create_data.get("codename", ""),
                        "app_label": create_data.get("app_label"),
                        "model": create_data.get("model"),
                    }

            # Build node data for sync
            node_data = {
                "menu_id": node_id,
                "type": node_type,
                "title_key": title_key,
                "href": href,
                "parent_id": parent_id,
                "level": level,
                "order": order,
                "permission_data": permission_data,
                "permission_to_create": permission_to_create,
                "translations": node.get("translations", {}),
            }

            # Add permission to create list if needed
            if permission_to_create:
                sync_plan["permissions_to_create"].append(permission_to_create)

            # Add to appropriate list
            if user_mapping.get("action") == "update":
                sync_plan["nodes_to_update"].append(node_data)
            else:
                sync_plan["nodes_to_create"].append(node_data)

            # Add to hierarchy for tree building
            sync_plan["hierarchy"].append(
                {
                    "menu_id": node_id,
                    "parent_id": parent_id,
                    "level": level,
                    "order": order,
                }
            )

            # Process children
            child_order = 0
            for child in node.get("children", []):
                process_node(child, node_id, level + 1, child_order)
                child_order += 1

        # Start processing from root
        root_order = 0
        for root_node in menu_hierarchy:
            process_node(root_node, None, 0, root_order)
            root_order += 1

        return sync_plan

    def _execute_sync_plan(self, sync_plan: Dict[str, Any]) -> Dict[str, Any]:
        """
        Execute the sync plan.

        Args:
            sync_plan: Detailed sync plan

        Returns:
            Execution results
        """
        results = {
            "permissions_created": [],
            "nodes_created": [],
            "nodes_updated": [],
            "errors": [],
        }

        # First, create any new permissions
        for perm_data in sync_plan.get("permissions_to_create", []):
            try:
                created_perm = permission_service.create_permission(
                    name=perm_data["name"],
                    codename=perm_data["codename"],
                    app_label=perm_data["app_label"],
                    model=perm_data["model"],
                )
                results["permissions_created"].append(created_perm)

                # Update node_data with the created permission ID
                for node_list in [
                    sync_plan["nodes_to_create"],
                    sync_plan["nodes_to_update"],
                ]:
                    for node_data in node_list:
                        if (
                            node_data.get("permission_to_create")
                            and node_data["permission_to_create"]["codename"]
                            == perm_data["codename"]
                            and node_data["permission_to_create"]["app_label"]
                            == perm_data["app_label"]
                            and node_data["permission_to_create"]["model"]
                            == perm_data["model"]
                        ):
                            # Replace permission_to_create with permission_data
                            node_data["permission_data"] = {
                                "permission_id": created_perm["id"]
                            }
                            node_data["permission_to_create"] = None
            except Exception as e:
                results["errors"].append(
                    {
                        "type": "permission_creation",
                        "data": perm_data,
                        "error": str(e),
                    }
                )

        # Create or update CustomPermissions nodes
        # We need to create nodes in level order to ensure parents exist
        hierarchy = sync_plan.get("hierarchy", [])
        hierarchy.sort(key=lambda x: (x["level"], x["order"]))

        # Map menu_id to created CustomPermission ID
        custom_perm_ids = {}

        for node_info in hierarchy:
            menu_id = node_info["menu_id"]

            # Find node data
            node_data = None
            for nd in sync_plan["nodes_to_create"]:
                if nd["menu_id"] == menu_id:
                    node_data = nd
                    break

            if not node_data:
                for nd in sync_plan["nodes_to_update"]:
                    if nd["menu_id"] == menu_id:
                        node_data = nd
                        break

            if not node_data:
                continue

            # Get parent CustomPermission ID
            parent_custom_perm_id = None
            if node_info["parent_id"]:
                parent_custom_perm_id = custom_perm_ids.get(node_info["parent_id"])

            # Create or update CustomPermission
            try:
                if node_data in sync_plan["nodes_to_create"]:
                    custom_perm = self._create_custom_permission(
                        node_data, parent_custom_perm_id
                    )
                    results["nodes_created"].append(
                        {
                            "menu_id": menu_id,
                            "custom_permission_id": custom_perm.id,
                        }
                    )
                    custom_perm_ids[menu_id] = custom_perm.id
                else:
                    custom_perm = self._update_custom_permission(
                        node_data, parent_custom_perm_id
                    )
                    results["nodes_updated"].append(
                        {
                            "menu_id": menu_id,
                            "custom_permission_id": custom_perm.id,
                        }
                    )
                    custom_perm_ids[menu_id] = custom_perm.id

            except Exception as e:
                results["errors"].append(
                    {
                        "type": "node_creation"
                        if node_data in sync_plan["nodes_to_create"]
                        else "node_update",
                        "menu_id": menu_id,
                        "error": str(e),
                    }
                )

        return results

    def _create_custom_permission(
        self, node_data: Dict[str, Any], parent_id: Optional[int]
    ) -> CustomPermissions:
        """
        Create a CustomPermission from node data.

        Args:
            node_data: Node data from sync plan
            parent_id: Parent CustomPermission ID

        Returns:
            Created CustomPermissions instance
        """
        # Get or create permission
        permission_instance = None
        if node_data.get("permission_data"):
            permission_id = node_data["permission_data"].get("permission_id")
            if permission_id:
                try:
                    permission_instance = Permission.objects.get(id=permission_id)
                except Permission.DoesNotExist:
                    pass

        # Use title_key as the stable key for syncing (refresh preview matches via title_key).
        # Translations are still saved separately for display.
        translations = node_data.get("translations", {})
        name = node_data.get("title_key", "") or translations.get("en", "")

        # Get codename from permission or suggestion
        codename = ""
        if permission_instance:
            codename = permission_instance.codename
        elif node_data.get("href") and node_data["href"] != "#":
            codename = get_suggested_codename_from_href(node_data["href"])

        # Create CustomPermission
        custom_perm = CustomPermissions.objects.create(
            name=name,
            codename=codename,
            permission=permission_instance,
        )

        # Set parent if provided
        if parent_id:
            try:
                parent = CustomPermissions.objects.get(id=parent_id)
                custom_perm.tn_parent = parent
                custom_perm.save()
            except CustomPermissions.DoesNotExist:
                pass

        # Save translations if modeltranslation is configured
        self._save_translations(custom_perm, translations)

        return custom_perm

    def _update_custom_permission(
        self, node_data: Dict[str, Any], parent_id: Optional[int]
    ) -> CustomPermissions:
        """
        Update an existing CustomPermission from node data.

        Args:
            node_data: Node data from sync plan
            parent_id: Parent CustomPermission ID

        Returns:
            Updated CustomPermissions instance
        """
        # Find existing CustomPermission by menu_id mapping
        # This would need to be implemented based on how we track mappings
        # For now, we'll create a new one (simplified)
        return self._create_custom_permission(node_data, parent_id)

    def _save_translations(
        self, custom_perm: CustomPermissions, translations: Dict[str, str]
    ) -> None:
        """
        Save translations for CustomPermission.

        Args:
            custom_perm: CustomPermissions instance
            translations: Dictionary of {language_code: translated_name}
        """
        # Check if modeltranslation is available
        try:
            from modeltranslation.utils import get_translation_fields

            translation_fields = get_translation_fields(custom_perm._meta.model_name)

            # Save translations for each language
            for lang, translation in translations.items():
                field_name = f"name_{lang}"
                if field_name in translation_fields:
                    setattr(custom_perm, field_name, translation)

            custom_perm.save()
        except ImportError:
            # Modeltranslation not available, just save English name
            if "en" in translations:
                custom_perm.name = translations["en"]
                custom_perm.save()

    def _summarize_changes(self, sync_plan: Dict[str, Any]) -> Dict[str, int]:
        """
        Summarize changes in sync plan.

        Args:
            sync_plan: Sync plan dictionary

        Returns:
            Dictionary with change counts
        """
        return {
            "nodes_to_create": len(sync_plan.get("nodes_to_create", [])),
            "nodes_to_update": len(sync_plan.get("nodes_to_update", [])),
            "permissions_to_create": len(sync_plan.get("permissions_to_create", [])),
            "total_changes": (
                len(sync_plan.get("nodes_to_create", []))
                + len(sync_plan.get("nodes_to_update", []))
                + len(sync_plan.get("permissions_to_create", []))
            ),
        }

    def search_existing_permissions_for_menu(
        self, menu_id: str
    ) -> List[Dict[str, Any]]:
        """
        Search for existing permissions that could match a menu item.

        Args:
            menu_id: Menu item ID

        Returns:
            List of potential matching permissions
        """
        # This would need to be implemented based on menu structure
        # For now, return empty list
        return []


# Singleton instance
menu_sync_service = MenuSyncService()
