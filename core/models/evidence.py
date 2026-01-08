from django.db import models
from django.core.validators import MinValueValidator, FileExtensionValidator
from .base import BaseModel
from .case import Case
from .user import UserProfile


class EvidenceStatus(models.TextChoices):
    COLLECTED = 'COLLECTED', 'Collected'
    UNDER_ANALYSIS = 'UNDER_ANALYSIS', 'Under Analysis'
    ANALYZED = 'ANALYZED', 'Analyzed'
    ARCHIVED = 'ARCHIVED', 'Archived'


class EvidenceType(models.TextChoices):
    WITNESS = 'WITNESS', 'Witness Testimony'
    BIOLOGICAL = 'BIOLOGICAL', 'Biological Evidence'
    VEHICLE = 'VEHICLE', 'Vehicle Evidence'
    DOCUMENT = 'DOCUMENT', 'Document Evidence'
    OTHER = 'OTHER', 'Other Evidence'


class BaseEvidence(BaseModel):
    case = models.ForeignKey(
        Case,
        on_delete=models.CASCADE,
        related_name='%(class)s_set',
        verbose_name="Related Case"
    )
    evidence_number = models.CharField(
        max_length=50,
        unique=True,
        verbose_name="Evidence Number"
    )
    evidence_type = models.CharField(
        max_length=20,
        choices=EvidenceType.choices,
        verbose_name="Evidence Type"
    )
    description = models.TextField(
        verbose_name="Description"
    )
    collected_by = models.ForeignKey(
        UserProfile,
        on_delete=models.SET_NULL,
        null=True,
        related_name='%(class)s_collected',
        verbose_name="Collected By"
    )
    collected_date = models.DateTimeField(
        verbose_name="Collection Date"
    )
    location = models.CharField(
        max_length=500,
        verbose_name="Collection Location"
    )
    status = models.CharField(
        max_length=20,
        choices=EvidenceStatus.choices,
        default=EvidenceStatus.COLLECTED,
        verbose_name="Status"
    )
    chain_of_custody = models.TextField(
        blank=True,
        verbose_name="Chain of Custody"
    )
    notes = models.TextField(
        blank=True,
        verbose_name="Notes"
    )

    class Meta:
        abstract = True
        ordering = ['-collected_date']

    def __str__(self):
        return f"{self.evidence_number} - {self.evidence_type}"

    def save(self, *args, **kwargs):
        if not self.evidence_number:
            self.evidence_number = self.generate_evidence_number()
        super().save(*args, **kwargs)

    @staticmethod
    def generate_evidence_number():
        from django.utils import timezone
        import random
        year = timezone.now().year
        random_num = random.randint(1000, 9999)
        return f"EV-{year}-{random_num}"


class WitnessTestimony(BaseEvidence):
    witness_name = models.CharField(
        max_length=200,
        verbose_name="Witness Name"
    )
    witness_contact = models.CharField(
        max_length=20,
        blank=True,
        verbose_name="Contact Number"
    )
    witness_address = models.TextField(
        blank=True,
        verbose_name="Address"
    )
    testimony_date = models.DateTimeField(
        verbose_name="Testimony Date"
    )
    testimony_text = models.TextField(
        verbose_name="Testimony"
    )
    is_credible = models.BooleanField(
        default=True,
        verbose_name="Is Credible"
    )
    credibility_score = models.IntegerField(
        default=5,
        validators=[MinValueValidator(1)],
        verbose_name="Credibility Score (1-10)"
    )
    audio_recording = models.FileField(
        upload_to='evidence/testimonies/audio/',
        blank=True,
        null=True,
        validators=[FileExtensionValidator(['mp3', 'wav', 'ogg', 'm4a'])],
        verbose_name="Audio Recording"
    )
    video_recording = models.FileField(
        upload_to='evidence/testimonies/video/',
        blank=True,
        null=True,
        validators=[FileExtensionValidator(['mp4', 'avi', 'mov'])],
        verbose_name="Video Recording"
    )

    class Meta:
        verbose_name = "Witness Testimony"
        verbose_name_plural = "Witness Testimonies"
        ordering = ['-testimony_date']

    def __str__(self):
        return f"{self.evidence_number} - {self.witness_name}"


class BiologicalEvidence(BaseEvidence):
    sample_type = models.CharField(
        max_length=100,
        verbose_name="Sample Type",
        help_text="e.g., Blood, DNA, Hair, Fingerprint"
    )
    sample_quantity = models.CharField(
        max_length=100,
        verbose_name="Sample Quantity"
    )
    storage_location = models.CharField(
        max_length=200,
        verbose_name="Storage Location"
    )
    lab_submitted = models.BooleanField(
        default=False,
        verbose_name="Submitted to Lab"
    )
    lab_submission_date = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="Lab Submission Date"
    )
    lab_results = models.TextField(
        blank=True,
        verbose_name="Lab Results"
    )
    lab_result_date = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="Result Date"
    )
    match_found = models.BooleanField(
        default=False,
        verbose_name="Match Found"
    )
    match_details = models.TextField(
        blank=True,
        verbose_name="Match Details"
    )
    image = models.ImageField(
        upload_to='evidence/biological/',
        blank=True,
        null=True,
        verbose_name="Evidence Image"
    )

    class Meta:
        verbose_name = "Biological Evidence"
        verbose_name_plural = "Biological Evidence"
        ordering = ['-collected_date']

    def __str__(self):
        return f"{self.evidence_number} - {self.sample_type}"


class VehicleEvidence(BaseEvidence):
    vehicle_type = models.CharField(
        max_length=100,
        verbose_name="Vehicle Type",
        help_text="e.g., Car, Motorcycle, Truck"
    )
    make = models.CharField(
        max_length=100,
        blank=True,
        verbose_name="Make"
    )
    model = models.CharField(
        max_length=100,
        blank=True,
        verbose_name="Model"
    )
    year = models.IntegerField(
        null=True,
        blank=True,
        verbose_name="Year"
    )
    color = models.CharField(
        max_length=50,
        blank=True,
        verbose_name="Color"
    )
    license_plate = models.CharField(
        max_length=20,
        blank=True,
        verbose_name="License Plate"
    )
    vin_number = models.CharField(
        max_length=50,
        blank=True,
        verbose_name="VIN Number"
    )
    owner_name = models.CharField(
        max_length=200,
        blank=True,
        verbose_name="Owner Name"
    )
    condition = models.TextField(
        blank=True,
        verbose_name="Vehicle Condition"
    )
    impounded = models.BooleanField(
        default=False,
        verbose_name="Impounded"
    )
    impound_location = models.CharField(
        max_length=200,
        blank=True,
        verbose_name="Impound Location"
    )
    images = models.ImageField(
        upload_to='evidence/vehicles/',
        blank=True,
        null=True,
        verbose_name="Vehicle Images"
    )

    class Meta:
        verbose_name = "Vehicle Evidence"
        verbose_name_plural = "Vehicle Evidence"
        ordering = ['-collected_date']

    def __str__(self):
        return f"{self.evidence_number} - {self.vehicle_type}"


class DocumentEvidence(BaseEvidence):
    document_type = models.CharField(
        max_length=100,
        verbose_name="Document Type",
        help_text="e.g., Contract, Letter, Receipt, ID"
    )
    document_date = models.DateField(
        null=True,
        blank=True,
        verbose_name="Document Date"
    )
    issuer = models.CharField(
        max_length=200,
        blank=True,
        verbose_name="Issuer"
    )
    recipient = models.CharField(
        max_length=200,
        blank=True,
        verbose_name="Recipient"
    )
    content_summary = models.TextField(
        blank=True,
        verbose_name="Content Summary"
    )
    is_original = models.BooleanField(
        default=True,
        verbose_name="Is Original"
    )
    is_authenticated = models.BooleanField(
        default=False,
        verbose_name="Is Authenticated"
    )
    authentication_date = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="Authentication Date"
    )
    document_file = models.FileField(
        upload_to='evidence/documents/',
        blank=True,
        null=True,
        validators=[FileExtensionValidator(['pdf', 'jpg', 'jpeg', 'png', 'doc', 'docx'])],
        verbose_name="Document File"
    )

    class Meta:
        verbose_name = "Document Evidence"
        verbose_name_plural = "Document Evidence"
        ordering = ['-collected_date']

    def __str__(self):
        return f"{self.evidence_number} - {self.document_type}"


class OtherEvidence(BaseEvidence):
    item_name = models.CharField(
        max_length=200,
        verbose_name="Item Name"
    )
    item_category = models.CharField(
        max_length=100,
        verbose_name="Category"
    )
    physical_description = models.TextField(
        verbose_name="Physical Description"
    )
    condition = models.CharField(
        max_length=100,
        verbose_name="Condition"
    )
    size_dimensions = models.CharField(
        max_length=100,
        blank=True,
        verbose_name="Size/Dimensions"
    )
    weight = models.CharField(
        max_length=50,
        blank=True,
        verbose_name="Weight"
    )
    material = models.CharField(
        max_length=100,
        blank=True,
        verbose_name="Material"
    )
    serial_number = models.CharField(
        max_length=100,
        blank=True,
        verbose_name="Serial Number"
    )
    image = models.ImageField(
        upload_to='evidence/other/',
        blank=True,
        null=True,
        verbose_name="Evidence Image"
    )
    additional_files = models.FileField(
        upload_to='evidence/other/files/',
        blank=True,
        null=True,
        verbose_name="Additional Files"
    )

    class Meta:
        verbose_name = "Other Evidence"
        verbose_name_plural = "Other Evidence"
        ordering = ['-collected_date']

    def __str__(self):
        return f"{self.evidence_number} - {self.item_name}"
