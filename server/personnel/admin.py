from django.contrib import admin
from treenode.admin import TreeNodeModelAdmin

from .models import (
    Allowances,
    BattalionTree,
    ContractTypes,
    JobTitles,
    Label,
  Locations,
    PayScale,
    Qualification,
    Ranks,
  Tribes,
)

# Register your models here.


@admin.register(Label)
class LabelAdmin(admin.ModelAdmin):
    list_display = ("name", "type", "is_active", "created_at")
    list_filter = ("type", "is_active", "is_deleted")
    search_fields = ("name",)
    ordering = ("-created_at",)


@admin.register(Qualification)
class QualificationAdmin(admin.ModelAdmin):
    list_display = ("name", "type", "is_active", "created_at")
    list_filter = ("type", "is_active", "is_deleted")
    search_fields = ("name",)
    ordering = ("-created_at",)


@admin.register(Ranks)
class RanksAdmin(admin.ModelAdmin):
    list_display = ("name", "months_of_service", "is_active", "created_at")
    list_filter = ("is_active", "is_deleted")
    search_fields = ("name",)
    ordering = ("-created_at",)


@admin.register(ContractTypes)
class ContractTypesAdmin(admin.ModelAdmin):
    list_display = ("name", "is_active", "created_at")
    list_filter = ("is_active", "is_deleted")
    search_fields = ("name",)
    ordering = ("-created_at",)


@admin.register(PayScale)
class PayScaleAdmin(admin.ModelAdmin):
    list_display = (
        "rank",
        "contract_type",
        "salary",
        "age_of_retirement",
        "is_active",
        "created_at",
    )
    list_filter = ("is_active", "is_deleted")
    search_fields = ("slug",)
    ordering = ("-created_at",)


@admin.register(Allowances)
class AllowancesAdmin(admin.ModelAdmin):
    list_display = ("contract_type", "name", "amount", "is_active", "created_at")
    list_filter = ("is_active", "is_deleted")
    search_fields = ("name",)
    ordering = ("-created_at",)


@admin.register(JobTitles)
class JobTitlesAdmin(admin.ModelAdmin):
    list_display = ("name", "is_active", "created_at")
    list_filter = ("is_active", "is_deleted")
    search_fields = ("name",)
    ordering = ("-created_at",)


@admin.register(BattalionTree)
class BattalionTreeAdmin(TreeNodeModelAdmin):
    list_display = ("name", "label", "tn_level", "tn_priority")
    list_filter = ("label", "tn_level")
    search_fields = ("name",)
    ordering = ("tn_order",)


@admin.register(Locations)
class LocationsAdmin(TreeNodeModelAdmin):
    list_display = ("name", "label", "tn_level", "tn_priority")
    list_filter = ("label", "tn_level")
    search_fields = ("name",)
    ordering = ("tn_order",)


@admin.register(Tribes)
class TribesAdmin(TreeNodeModelAdmin):
    list_display = ("name", "tn_level", "tn_priority")
    list_filter = ("tn_level",)
    search_fields = ("name",)
    ordering = ("tn_order",)
