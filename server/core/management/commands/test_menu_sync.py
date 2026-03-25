"""
Management command to test menu sync functionality.
"""

from django.contrib.auth.models import ContentType, Permission
from django.core.management.base import BaseCommand

from core.models import CustomPermissions
from core.permissions.menu_parser import menu_parser
from core.permissions.service import permission_service
from core.permissions.sync_service import menu_sync_service


class Command(BaseCommand):
    help = "Test menu sync functionality"

    def add_arguments(self, parser):
        parser.add_argument(
            "--preview",
            action="store_true",
            help="Show sync preview without executing",
        )
        parser.add_argument(
            "--clear",
            action="store_true",
            help="Clear existing CustomPermissions before test",
        )
        parser.add_argument(
            "--create-sample",
            action="store_true",
            help="Create sample permissions for testing",
        )

    def handle(self, *args, **options):
        if options["clear"]:
            self.stdout.write("Clearing existing CustomPermissions...")
            CustomPermissions.objects.all().delete()
            self.stdout.write(self.style.SUCCESS("Cleared all CustomPermissions"))

        if options["create_sample"]:
            self.create_sample_permissions()

        if options["preview"]:
            self.test_preview()
        else:
            self.test_full_sync()

    def create_sample_permissions(self):
        """Create sample Django permissions for testing."""
        self.stdout.write("Creating sample permissions...")

        # Get or create content types
        content_types = {}
        for app_label, model in [
            ("personnel", "label"),
            ("personnel", "tribe"),
            ("personnel", "location"),
            ("core", "user"),
        ]:
            try:
                ct = ContentType.objects.get(app_label=app_label, model=model)
                content_types[f"{app_label}.{model}"] = ct
            except ContentType.DoesNotExist:
                self.stdout.write(
                    self.style.WARNING(f"ContentType not found: {app_label}.{model}")
                )
                continue

        # Create sample permissions
        sample_permissions = [
            {
                "name": "View Label",
                "codename": "view_label",
                "content_type": content_types.get("personnel.label"),
            },
            {
                "name": "Add Label",
                "codename": "add_label",
                "content_type": content_types.get("personnel.label"),
            },
            {
                "name": "View Tribe",
                "codename": "view_tribe",
                "content_type": content_types.get("personnel.tribe"),
            },
            {
                "name": "View Location",
                "codename": "view_location",
                "content_type": content_types.get("personnel.location"),
            },
            {
                "name": "View User",
                "codename": "view_user",
                "content_type": content_types.get("core.user"),
            },
        ]

        created_count = 0
        for perm_data in sample_permissions:
            if not perm_data["content_type"]:
                continue

            # Check if permission already exists
            if not Permission.objects.filter(
                codename=perm_data["codename"],
                content_type=perm_data["content_type"],
            ).exists():
                Permission.objects.create(**perm_data)
                created_count += 1

        self.stdout.write(
            self.style.SUCCESS(f"Created {created_count} sample permissions")
        )

    def test_preview(self):
        """Test sync preview functionality."""
        self.stdout.write("Testing sync preview...")

        try:
            # Test menu parser
            self.stdout.write("\n1. Testing menu parser...")
            menu_data = menu_parser.get_menu_structure()
            if menu_data["success"]:
                self.stdout.write(
                    self.style.SUCCESS(
                        f"✓ Menu parsed successfully: {len(menu_data['menu_hierarchy'])} groups"
                    )
                )

                # Show some stats
                def count_nodes(nodes):
                    total = 0
                    leaf_with_href = 0
                    for node in nodes:
                        total += 1
                        if node.get("href") and node["href"] != "#":
                            leaf_with_href += 1
                        if node.get("children"):
                            child_stats = count_nodes(node["children"])
                            total += child_stats["total"]
                            leaf_with_href += child_stats["leaf_with_href"]
                    return {"total": total, "leaf_with_href": leaf_with_href}

                stats = count_nodes(menu_data["menu_hierarchy"])
                self.stdout.write(f"   - Total nodes: {stats['total']}")
                self.stdout.write(
                    f"   - Leaf nodes with href: {stats['leaf_with_href']}"
                )
            else:
                self.stdout.write(
                    self.style.ERROR(f"✗ Menu parsing failed: {menu_data.get('error')}")
                )
                return

            # Test permission service
            self.stdout.write("\n2. Testing permission service...")
            apps_models = permission_service.get_all_apps_with_models()
            self.stdout.write(
                self.style.SUCCESS(f"✓ Found {len(apps_models)} apps with models")
            )
            for app, models in list(apps_models.items())[:3]:  # Show first 3
                self.stdout.write(f"   - {app}: {len(models)} models")

            # Test sync preview
            self.stdout.write("\n3. Testing sync preview...")
            preview_data = menu_sync_service.get_sync_preview()
            if preview_data["success"]:
                self.stdout.write(
                    self.style.SUCCESS("✓ Sync preview generated successfully")
                )
                stats = preview_data.get("stats", {})
                self.stdout.write(f"   - Total items: {stats.get('total', 0)}")
                self.stdout.write(f"   - New items: {stats.get('new', 0)}")
                self.stdout.write(f"   - Existing items: {stats.get('existing', 0)}")
                self.stdout.write(f"   - Modified items: {stats.get('modified', 0)}")
                self.stdout.write(
                    f"   - Needs permission: {stats.get('needs_permission', 0)}"
                )
            else:
                self.stdout.write(
                    self.style.ERROR(
                        f"✗ Sync preview failed: {preview_data.get('error')}"
                    )
                )

            # Test permission search
            self.stdout.write("\n4. Testing permission search...")
            search_results = permission_service.search_permissions("view", 5)
            self.stdout.write(
                self.style.SUCCESS(
                    f"✓ Found {len(search_results)} permissions matching 'view'"
                )
            )
            for perm in search_results[:3]:  # Show first 3
                self.stdout.write(
                    f"   - {perm['codename']} ({perm['app_label']}.{perm['model']})"
                )

        except Exception as e:
            self.stdout.write(self.style.ERROR(f"✗ Test failed: {str(e)}"))
            import traceback

            self.stdout.write(traceback.format_exc())

    def test_full_sync(self):
        """Test full sync with sample mappings."""
        self.stdout.write("Testing full sync with sample mappings...")

        try:
            # First get preview
            preview_data = menu_sync_service.get_sync_preview()
            if not preview_data["success"]:
                self.stdout.write(
                    self.style.ERROR(
                        f"✗ Cannot get preview: {preview_data.get('error')}"
                    )
                )
                return

            # Create sample mappings for the first few leaf nodes
            mappings = {}

            def collect_leaf_nodes(nodes, result):
                for node in nodes:
                    if node.get("href") and node["href"] != "#":
                        # This is a leaf node that needs permission
                        result[node["id"]] = {
                            "menu_id": node["id"],
                            "permission_id": None,  # We'll search for existing
                        }
                    if node.get("children"):
                        collect_leaf_nodes(node["children"], result)

            collect_leaf_nodes(preview_data["preview"], mappings)

            # Limit to first 3 for testing
            test_mappings = dict(list(mappings.items())[:3])

            if not test_mappings:
                self.stdout.write(self.style.WARNING("No leaf nodes found to map"))
                return

            self.stdout.write(f"Found {len(test_mappings)} leaf nodes to map")

            # For each mapping, try to find existing permission
            # Create a list of menu_ids to iterate over (to avoid modifying dict during iteration)
            menu_ids = list(test_mappings.keys())
            for menu_id in menu_ids:
                # Extract suggested codename from menu node
                def find_node(nodes, target_id):
                    for node in nodes:
                        if node["id"] == target_id:
                            return node
                        if node.get("children"):
                            found = find_node(node["children"], target_id)
                            if found:
                                return found
                    return None

                node = find_node(preview_data["preview"], menu_id)
                if node and node.get("suggestions", {}).get("codename"):
                    codename = node["suggestions"]["codename"]
                    existing = permission_service.get_permission_by_codename(codename)
                    if existing:
                        test_mappings[menu_id]["permission_id"] = existing["id"]
                        self.stdout.write(
                            f"  - {node.get('title', menu_id)} -> {codename} (existing)"
                        )
                    else:
                        self.stdout.write(
                            f"  - {node.get('title', menu_id)} -> {codename} (not found)"
                        )
                        # Remove from test mappings if no permission found
                        del test_mappings[menu_id]

            if not test_mappings:
                self.stdout.write(
                    self.style.WARNING(
                        "No existing permissions found for test mappings"
                    )
                )
                return

            # Test dry run
            self.stdout.write("\nTesting dry run...")
            dry_run_result = menu_sync_service.execute_sync(test_mappings, dry_run=True)

            if dry_run_result["success"]:
                self.stdout.write(
                    self.style.SUCCESS("✓ Dry run completed successfully")
                )
                changes = dry_run_result.get("changes", {})
                self.stdout.write(
                    f"  - Nodes to create: {changes.get('nodes_to_create', 0)}"
                )
                self.stdout.write(
                    f"  - Nodes to update: {changes.get('nodes_to_update', 0)}"
                )
                self.stdout.write(
                    f"  - Permissions to create: {changes.get('permissions_to_create', 0)}"
                )
                self.stdout.write(
                    f"  - Total changes: {changes.get('total_changes', 0)}"
                )

                # Skip actual execution in test mode
                self.stdout.write("\n" + "=" * 50)
                self.stdout.write("Test completed successfully (dry run only)")
                self.stdout.write("\nTo execute actual sync, use the web interface at:")
                self.stdout.write("/administration/permissions/sync-menu")
            else:
                self.stdout.write(
                    self.style.ERROR(f"✗ Dry run failed: {dry_run_result.get('error')}")
                )

        except Exception as e:
            self.stdout.write(self.style.ERROR(f"✗ Test failed: {str(e)}"))
            import traceback

            self.stdout.write(traceback.format_exc())
