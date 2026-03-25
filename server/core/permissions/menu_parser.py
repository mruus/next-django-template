"""
Menu parser service to parse TypeScript menu file and load translations.
Parses menu-list.ts and loads translations from JSON files.
"""

import json
import os
import re
from pathlib import Path
from typing import Any, Dict, List, Optional

# Project root directory (adjust as needed)
# menu_parser.py is at: server/core/permissions/menu_parser.py
# Project root is: server/../../ (which is the sna-v2 directory)
PROJECT_ROOT = Path(__file__).parent.parent.parent.parent


class MenuParser:
    """Service for parsing menu structure from TypeScript and loading translations."""

    def __init__(self):
        self.menu_file_path = (
            PROJECT_ROOT / "app/[locale]/(home)/components/menu-list.ts"
        )
        self.messages_dir = PROJECT_ROOT / "messages"
        self.languages = ["en", "ar", "so"]

        # Debug: print paths for verification (commented out for production)
        # import os
        # print(f"PROJECT_ROOT: {PROJECT_ROOT}")
        # print(f"Menu file path: {self.menu_file_path}")
        # print(f"Menu file exists: {os.path.exists(self.menu_file_path)}")
        # print(f"Messages dir exists: {os.path.exists(self.messages_dir)}")

    def parse_menu_file(self) -> List[Dict[str, Any]]:
        """
        Parse the TypeScript menu file and extract menu structure.

        Returns:
            List of menu items with hierarchy
        """
        if not self.menu_file_path.exists():
            raise FileNotFoundError(f"Menu file not found: {self.menu_file_path}")

        content = self.menu_file_path.read_text(encoding="utf-8")

        # Find the menuList array
        start_marker = "export const menuList: MenuItem[] = ["
        start_idx = content.find(start_marker)
        if start_idx == -1:
            raise ValueError("Could not find menuList in TypeScript file")

        start_idx += len(start_marker)

        # Parse the array by counting braces and brackets
        menu_items = []
        current_pos = start_idx
        brace_depth = 0
        bracket_depth = 1  # We're already inside the array
        in_string = False
        string_char = None
        escape_next = False
        current_item = []

        while current_pos < len(content):
            char = content[current_pos]

            if escape_next:
                current_item.append(char)
                escape_next = False
                current_pos += 1
                continue

            if in_string:
                if char == string_char:
                    in_string = False
                elif char == "\\":
                    escape_next = True
                current_item.append(char)
            else:
                if char == "{":
                    brace_depth += 1
                    current_item.append(char)
                elif char == "}":
                    brace_depth -= 1
                    current_item.append(char)

                    # If we've closed an object at top level (brace_depth == 0)
                    if brace_depth == 0:
                        # Parse this item
                        item_str = "".join(current_item)
                        menu_item = self._parse_menu_item_simple(item_str)
                        if menu_item:
                            menu_items.append(menu_item)
                        current_item = []
                elif char == "[":
                    bracket_depth += 1
                    current_item.append(char)
                elif char == "]":
                    bracket_depth -= 1
                    if bracket_depth == 0:
                        # End of array
                        break
                    current_item.append(char)
                elif char in ('"', "'"):
                    in_string = True
                    string_char = char
                    current_item.append(char)
                elif char == "," and brace_depth == 0 and bracket_depth == 1:
                    # Separator between items at top level, skip it
                    pass
                else:
                    current_item.append(char)

            current_pos += 1

        # Build hierarchy with groups
        return self._build_menu_hierarchy(menu_items)

    def _parse_menu_item_simple(self, item_str: str) -> Dict[str, Any]:
        """
        Parse a single menu item from TypeScript object string using simple parsing.

        Args:
            item_str: TypeScript object string for a menu item

        Returns:
            Parsed menu item dictionary
        """
        import re

        # Remove outer braces
        item_str = item_str.strip()
        if item_str.startswith("{"):
            item_str = item_str[1:].rstrip("}")

        result = {}

        # Split by commas but handle nested structures
        lines = item_str.split("\n")
        current_key = None
        current_value = []
        in_nested = 0

        for line in lines:
            line = line.strip()
            if not line:
                continue

            # Check for key-value pairs
            if ":" in line and in_nested == 0:
                # Save previous key-value pair
                if current_key is not None and current_value:
                    value_str = " ".join(current_value).strip()
                    if value_str:
                        result[current_key] = self._parse_value_simple(value_str)

                # Start new key-value pair
                parts = line.split(":", 1)
                current_key = parts[0].strip()
                value_part = parts[1].strip()
                # Remove trailing comma if present
                if value_part.endswith(","):
                    value_part = value_part[:-1].strip()
                current_value = [value_part] if value_part else []
            else:
                # Continue accumulating value
                if current_value is not None:
                    current_value.append(line)

            # Update nested counter
            in_nested += line.count("{") + line.count("[")
            in_nested -= line.count("}") + line.count("]")

        # Save last key-value pair
        if current_key is not None and current_value:
            value_str = " ".join(current_value).strip()
            if value_str:
                result[current_key] = self._parse_value_simple(value_str)

        return result

    def _parse_value_simple(self, value_str: str) -> Any:
        """
        Parse a TypeScript value into Python value (simplified).

        Args:
            value_str: TypeScript value string

        Returns:
            Parsed value
        """
        value_str = value_str.strip()

        # Remove trailing comma if present
        if value_str.endswith(","):
            value_str = value_str[:-1].strip()

        # Handle strings
        if (value_str.startswith('"') and value_str.endswith('"')) or (
            value_str.startswith("'") and value_str.endswith("'")
        ):
            return value_str[1:-1]

        # Handle arrays (children)
        if value_str.startswith("[") and value_str.endswith("]"):
            # Parse children array
            array_content = value_str[1:-1].strip()
            if not array_content:
                return []

            children = []
            # Simple parsing of child objects
            # Split by "}," to get individual child objects
            child_strs = array_content.split("},")
            for i, child_str in enumerate(child_strs):
                child_str = child_str.strip()
                # Add back the closing brace for all but last
                if i < len(child_strs) - 1 and not child_str.endswith("}"):
                    child_str += "}"

                if child_str.startswith("{"):
                    child_str = child_str[1:].rstrip("}")
                    # Parse child object
                    child = {}
                    parts = child_str.split(",")
                    for part in parts:
                        part = part.strip()
                        if ":" in part:
                            key, val = part.split(":", 1)
                            key = key.strip().strip("\"'")
                            val = val.strip().strip("\"'").rstrip(",")
                            child[key] = val
                    if child:
                        children.append(child)

            return children

        # Handle icon names (identifiers)
        if value_str.replace("_", "").isalnum() and not value_str[0].isdigit():
            return value_str

        # Handle null/undefined
        if value_str in ("null", "undefined"):
            return None

        return value_str

    def _parse_children_array(self, children_str: str) -> List[Dict[str, str]]:
        """
        Parse children array from TypeScript.

        Args:
            children_str: TypeScript array string for children

        Returns:
            List of child dictionaries
        """
        # This method is kept for compatibility but uses the new parsing logic
        children = self._parse_value_simple(f"[{children_str}]")
        return children if isinstance(children, list) else []

    def _parse_value(self, value_str: str) -> Any:
        """
        Parse a TypeScript value into Python value.
        Legacy method kept for compatibility.

        Args:
            value_str: TypeScript value string

        Returns:
            Parsed value
        """
        return self._parse_value_simple(value_str)

    def _build_menu_hierarchy(
        self, menu_items: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """
        Build menu hierarchy with groups and parent-child relationships.

        Args:
            menu_items: Parsed menu items

        Returns:
            Hierarchical menu structure
        """
        # First, organize by group
        groups = {}
        for item in menu_items:
            group_key = item.get("group")
            if group_key is None:
                # Skip items without group for now
                continue
            if group_key not in groups:
                groups[group_key] = []
            groups[group_key].append(item)

        # Build hierarchy
        hierarchy = []
        for group_key, items in groups.items():
            # Create group node
            group_node = {
                "id": f"group_{group_key}",
                "type": "group",
                "title_key": group_key,
                "href": None,
                "has_children": bool(items),
                "children": [],
            }

            # Add items to group
            for item in items:
                menu_node = self._create_menu_node(item)
                group_node["children"].append(menu_node)

            hierarchy.append(group_node)

        return hierarchy

    def _create_menu_node(self, item: Dict[str, Any]) -> Dict[str, Any]:
        """
        Create a menu node from parsed item.

        Args:
            item: Parsed menu item

        Returns:
            Menu node dictionary
        """
        node = {
            "id": f"menu_{item.get('title', '').replace('.', '_')}",
            "type": "menu",
            "title_key": item.get("title"),
            "href": item.get("href"),
            "icon_name": item.get("iconName"),
            "has_children": bool(item.get("children")),
        }

        # Add children if present
        children = item.get("children")
        if children and isinstance(children, list):
            node["children"] = []
            for child in children:
                if isinstance(child, dict):
                    node["children"].append(
                        {
                            "id": f"child_{child.get('title', '').replace('.', '_')}",
                            "type": "child",
                            "title_key": child.get("title"),
                            "href": child.get("href"),
                            "has_children": False,
                        }
                    )

        return node

    def load_translations(self) -> Dict[str, Dict[str, Any]]:
        """
        Load translations from all language JSON files.

        Returns:
            Dictionary of {language_code: translations}
        """
        translations = {}

        for lang in self.languages:
            lang_dir = self.messages_dir / lang
            menu_file = lang_dir / "menu.json"

            if menu_file.exists():
                try:
                    with open(menu_file, "r", encoding="utf-8") as f:
                        translations[lang] = json.load(f)
                except (json.JSONDecodeError, IOError) as e:
                    print(f"Warning: Could not load translations for {lang}: {e}")
                    translations[lang] = {}

        return translations

    def get_translation(
        self, translations: Dict[str, Dict[str, Any]], key: str, lang: str
    ) -> str:
        """
        Get translation for a key in a specific language.

        Args:
            translations: Loaded translations dictionary
            key: Translation key (e.g., "menu.ciidanka" or "ciidanka")
            lang: Language code

        Returns:
            Translated string or the key if not found
        """
        if lang not in translations:
            return key

        # Remove "menu." prefix if present
        if key.startswith("menu."):
            key = key[5:]

        # Navigate through nested structure
        lang_translations = translations[lang]
        parts = key.split(".")

        current = lang_translations
        for part in parts:
            if isinstance(current, dict) and part in current:
                current = current[part]
            else:
                return key

        return str(current) if current is not None else key

    def get_all_translations_for_key(
        self, translations: Dict[str, Dict[str, Any]], key: str
    ) -> Dict[str, str]:
        """
        Get translations for a key in all languages.

        Args:
            translations: Loaded translations dictionary
            key: Translation key

        Returns:
            Dictionary of {language_code: translated_string}
        """
        result = {}
        for lang in self.languages:
            result[lang] = self.get_translation(translations, key, lang)
        return result

    def enrich_menu_with_translations(
        self, menu_hierarchy: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """
        Add translations to menu hierarchy.

        Args:
            menu_hierarchy: Menu hierarchy without translations

        Returns:
            Menu hierarchy with translations added
        """
        translations = self.load_translations()

        def enrich_node(node):
            # Add translations for title
            title_key = node.get("title_key")
            if title_key:
                node["translations"] = self.get_all_translations_for_key(
                    translations, title_key
                )
                # Add default title (English)
                node["title"] = node["translations"].get("en", title_key)

            # Recursively enrich children
            if "children" in node:
                for child in node["children"]:
                    enrich_node(child)

            return node

        enriched_hierarchy = []
        for node in menu_hierarchy:
            enriched_hierarchy.append(enrich_node(node))

        return enriched_hierarchy

    def get_menu_structure(self) -> Dict[str, Any]:
        """
        Get complete menu structure with translations.

        Returns:
            Dictionary with menu hierarchy and metadata
        """
        try:
            menu_hierarchy = self.parse_menu_file()
            enriched_hierarchy = self.enrich_menu_with_translations(menu_hierarchy)
            translations = self.load_translations()

            return {
                "success": True,
                "menu_hierarchy": enriched_hierarchy,
                "translations_available": list(translations.keys()),
                "source_file": str(self.menu_file_path),
            }
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "menu_hierarchy": [],
                "translations_available": [],
            }


# Singleton instance
menu_parser = MenuParser()
