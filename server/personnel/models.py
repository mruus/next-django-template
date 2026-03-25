from django.db import models
from treenode.models import TreeNodeModel

from utils.defaults import DefaultModel


class Label(DefaultModel):
    TYPES = (
        ("battalion", "Battalion"),
        ("location", "Location"),
    )
    name = models.CharField(max_length=255)
    type = models.CharField(max_length=255, choices=TYPES)

    class Meta:
        verbose_name = "Label"
        verbose_name_plural = "Labels"


class Qualification(DefaultModel):
    TYPES = (
        ("education", "Education"),
        ("skill", "Skill"),
    )
    name = models.CharField(max_length=255)
    type = models.CharField(max_length=255, choices=TYPES)

    class Meta:
        verbose_name = "Qualification"
        verbose_name_plural = "Qualifications"


class Banks(DefaultModel):
    name = models.CharField(max_length=255)

    class Meta:
        verbose_name = "Bank"
        verbose_name_plural = "Banks"


class ContractTypes(DefaultModel):
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)

    class Meta:
        verbose_name = "Contract Type"
        verbose_name_plural = "Contract Types"


class Ranks(DefaultModel):
    name = models.CharField(max_length=255)
    months_of_service = models.IntegerField()

    class Meta:
        verbose_name = "Rank"
        verbose_name_plural = "Ranks"


class PayScale(DefaultModel):
    rank = models.ForeignKey(Ranks, on_delete=models.CASCADE, related_name="pay_scales")
    contract_type = models.ForeignKey(ContractTypes, on_delete=models.CASCADE, related_name="pay_scales")
    salary = models.DecimalField(max_digits=10, decimal_places=2)
    iida = models.DecimalField(max_digits=10, decimal_places=2)
    deduction = models.DecimalField(max_digits=10, decimal_places=2)
    insurance = models.DecimalField(max_digits=10, decimal_places=2)
    age_of_retirement = models.IntegerField()
    slug = models.SlugField(unique=True)

    class Meta:
        verbose_name = "Pay Scale"
        verbose_name_plural = "Pay Scales"


class Allowances(DefaultModel):
    contract_type = models.ForeignKey(ContractTypes, on_delete=models.CASCADE, related_name="allowances")
    name = models.CharField(max_length=255)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    description = models.TextField(blank=True, null=True)

    class Meta:
        verbose_name = "Allowance"
        verbose_name_plural = "Allowances"


class JobTitles(DefaultModel):
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)

    class Meta:
        verbose_name = "Job Title"
        verbose_name_plural = "Job Titles"


class BattalionTree(TreeNodeModel, DefaultModel):
    name = models.CharField(max_length=255)
    label = models.ForeignKey(Label, on_delete=models.CASCADE, related_name="battalions")

    # NEW: tell treenode which field to show in tree
    treenode_display_field = "name"

    class Meta(TreeNodeModel.Meta):
        verbose_name = "Battalion Tree"
        verbose_name_plural = "Battalion Trees"

    class TreeNodeMeta:
        parent_attr = "tn_parent"


class Tribes(DefaultModel, TreeNodeModel):
    name = models.CharField(max_length=255)

    # NEW: tell treenode which field to show in tree
    treenode_display_field = "name"

    class Meta(TreeNodeModel.Meta):
        verbose_name = "Tribe"
        verbose_name_plural = "Tribes"

    class TreeNodeMeta:
        parent_attr = "tn_parent"


class Locations(DefaultModel, TreeNodeModel):
    name = models.CharField(max_length=255)
    label = models.ForeignKey(Label, on_delete=models.CASCADE, related_name="locations")

    # NEW: tell treenode which field to show in tree
    treenode_display_field = "name"

    class Meta(TreeNodeModel.Meta):
        verbose_name = "Location"
        verbose_name_plural = "Locations"

    class TreeNodeMeta:
        parent_attr = "tn_parent"


class Personnel(DefaultModel):
    first_name = models.CharField(max_length=255)
    last_name = models.CharField(max_length=255)
    third_name = models.CharField(max_length=255, blank=True)
    fourth_name = models.CharField(max_length=255, blank=True)
    gender = models.CharField(max_length=1, blank=True)
    martial = models.CharField(max_length=255, blank=True)
    lcx = models.CharField(max_length=100, blank=True)
    unique_code = models.CharField(max_length=100, blank=True, unique=True) # Generated automatically
    place_of_birth = models.CharField(max_length=255, blank=True)
    date_of_birth = models.DateField(blank=True, null=True)
    blood = models.CharField(max_length=3, blank=True)
    photo = models.ImageField(upload_to="personnel/photos/", blank=True)
    form_type = models.CharField(max_length=100, blank=True, default="Form")

    class Meta:
        verbose_name = "Personnel"
        verbose_name_plural = "Personnel"


class PersonnelTribe(DefaultModel):
    personnel = models.ForeignKey(Personnel, on_delete=models.CASCADE, related_name="personnel_tribes")
    tribe = models.ForeignKey(Tribes, on_delete=models.CASCADE, related_name="personnel_tribes")

    class Meta:
        verbose_name = "Personnel Tribe"
        verbose_name_plural = "Personnel Tribes"

class PersonnelLocation(DefaultModel):
    personnel = models.ForeignKey(Personnel, on_delete=models.CASCADE, related_name="locations")
    location = models.ForeignKey(Locations, on_delete=models.CASCADE, related_name="personnel_locations")
    phone = models.CharField(max_length=20, blank=True)
    alt_phone = models.CharField(max_length=20, blank=True)

    class Meta:
        verbose_name = "Personnel Location"
        verbose_name_plural = "Personnel Locations"



class BattalionHead(DefaultModel):
    personnel = models.ForeignKey(Personnel, on_delete=models.CASCADE, related_name="battalion_heads")
    battalion = models.ForeignKey(BattalionTree, on_delete=models.CASCADE, related_name="battalion_heads")

    class Meta:
        verbose_name = "Battalion Head"
        verbose_name_plural = "Battalion Heads"


class Assignment(DefaultModel):
    personnel = models.ForeignKey(Personnel, on_delete=models.CASCADE, related_name="assignments")
    pay_scale = models.ForeignKey(PayScale, on_delete=models.CASCADE, related_name="assignments")
    job_title = models.ForeignKey(JobTitles, on_delete=models.CASCADE, related_name="assignments")
    battalion = models.ForeignKey(BattalionTree, on_delete=models.CASCADE, related_name="assignments")
    allowance = models.ForeignKey(Allowances, on_delete=models.CASCADE, blank=True, null=True, related_name="assignments")
    basic_pay = models.DecimalField(max_digits=10, decimal_places=2)
    iidaan = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    allowance = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    netpay = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    payslip_no = models.CharField(max_length=50, blank=True)
    description = models.TextField(blank=True)
    decree_date = models.DateField(blank=True, null=True)
    decree_attachment = models.FileField(upload_to='decree_attachments/', blank=True, null=True)
    decree_number = models.CharField(max_length=50, blank=True)
    is_payroll = models.BooleanField(default=False)
    is_paid = models.BooleanField(default=False)

    class Meta:
        verbose_name = "Assignment"
        verbose_name_plural = "Assignments"
