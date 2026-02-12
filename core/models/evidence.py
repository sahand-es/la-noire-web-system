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
    title = models.CharField(
        max_length=255,
        default='',
        blank=True,
        verbose_name="Title"
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
        verbose_name="Lab Results / Follow-up Result"
    )
    coroner_approved = models.BooleanField(
        default=False,
        verbose_name="Coroner Approved"
    )
    coroner_approved_by = models.ForeignKey(
        UserProfile,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='coroner_approved_evidence',
        verbose_name="Approved By (Coroner)"
    )
    coroner_approved_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="Coroner Approval Date"
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

    def clean(self):
        from django.core.exceptions import ValidationError
        has_plate = bool(self.license_plate and self.license_plate.strip())
        has_serial = bool(self.vin_number and self.vin_number.strip())
        if has_plate and has_serial:
            raise ValidationError(
                'License plate and serial number (VIN) cannot both be set.'
            )



class DocumentEvidence(BaseEvidence):
    """
    Document evidence model supporting key-value pairs for flexible document information storage.
    Supports identification documents where information may be incomplete or missing.
    """

    document_type = models.CharField(
        max_length=100,
        verbose_name="Document Type",
        help_text="e.g., National ID, Passport, Driver License, Contract, Letter, Receipt"
    )

    document_date = models.DateField(
        null=True,
        blank=True,
        verbose_name="Document Date"
    )

    # Owner information (for identification documents)
    owner_full_name = models.CharField(
        max_length=255,
        blank=True,
        verbose_name="Document Owner Full Name",
        help_text="Complete name of the document owner (for ID documents)"
    )

    # Flexible key-value storage for document attributes
    document_attributes = models.JSONField(
        default=dict,
        blank=True,
        verbose_name="Document Attributes",
        help_text="Key-value pairs for document information (e.g., {'ID_Number': '1234567890', 'Issue_Date': '2020-01-01'})"
    )

    # Standard document fields
    issuer = models.CharField(
        max_length=200,
        blank=True,
        verbose_name="Issuer Organization"
    )

    content_summary = models.TextField(
        blank=True,
        verbose_name="Content Summary"
    )

    # Document authenticity tracking
    is_original = models.BooleanField(
        default=True,
        verbose_name="Is Original Document"
    )

    is_authenticated = models.BooleanField(
        default=False,
        verbose_name="Is Authenticated",
        help_text="Has the document been verified for authenticity"
    )

    authentication_date = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="Authentication Date"
    )

    authenticated_by = models.ForeignKey(
        UserProfile,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='authenticated_documents',
        verbose_name="Authenticated By"
    )

    # File attachments
    document_file = models.FileField(
        upload_to='evidence/documents/',
        blank=True,
        null=True,
        validators=[FileExtensionValidator(['pdf', 'jpg', 'jpeg', 'png', 'doc', 'docx', 'txt'])],
        verbose_name="Document File"
    )

    # Additional images (for multiple pages/sides)
    additional_images = models.JSONField(
        default=list,
        blank=True,
        verbose_name="Additional Images",
        help_text="List of additional image file paths for multi-page documents"
    )

    # Identification document specific fields
    is_identification_document = models.BooleanField(
        default=False,
        verbose_name="Is Identification Document",
        help_text="True if this is an ID card, passport, license, etc."
    )

    suspected_owner = models.ForeignKey(
        UserProfile,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='suspected_documents',
        verbose_name="Suspected Owner",
        help_text="Person suspected to be the owner of this document"
    )

    class Meta:
        verbose_name = "Document Evidence"
        verbose_name_plural = "Document Evidence"
        ordering = ['-collected_date']
        indexes = [
            models.Index(fields=['document_type']),
            models.Index(fields=['is_identification_document']),
            models.Index(fields=['owner_full_name']),
            models.Index(fields=['is_authenticated']),
        ]

    def __str__(self):
        if self.owner_full_name:
            return f"{self.evidence_number} - {self.document_type} ({self.owner_full_name})"
        return f"{self.evidence_number} - {self.document_type}"

    def add_attribute(self, key, value):
        """Add a key-value pair to document attributes"""
        if not self.document_attributes:
            self.document_attributes = {}
        self.document_attributes[key] = value
        self.save()

    def remove_attribute(self, key):
        """Remove a key-value pair from document attributes"""
        if self.document_attributes and key in self.document_attributes:
            del self.document_attributes[key]
            self.save()

    def get_attribute(self, key, default=None):
        """Get a specific attribute value"""
        if not self.document_attributes:
            return default
        return self.document_attributes.get(key, default)

    def update_attributes(self, attributes_dict):
        """Update multiple attributes at once"""
        if not self.document_attributes:
            self.document_attributes = {}
        self.document_attributes.update(attributes_dict)
        self.save()

    def get_all_attributes(self):
        """Get all document attributes as a dictionary"""
        return self.document_attributes or {}

    def mark_as_authenticated(self, authenticated_by_user):
        """Mark document as authenticated"""
        from django.utils import timezone
        self.is_authenticated = True
        self.authentication_date = timezone.now()
        self.authenticated_by = authenticated_by_user
        self.save()

    @property
    def has_complete_information(self):
        """Check if document has complete information based on type"""
        if self.is_identification_document:
            required_fields = ['owner_full_name']
            return all(getattr(self, field) for field in required_fields)
        return bool(self.content_summary)

    @property
    def missing_information(self):
        """Get list of missing information fields"""
        missing = []

        if self.is_identification_document:
            if not self.owner_full_name:
                missing.append('Owner Full Name')

        if not self.content_summary:
            missing.append('Content Summary')

        if not self.issuer:
            missing.append('Issuer')

        return missing

    def get_identification_summary(self):
        """Get summary for identification documents"""
        if not self.is_identification_document:
            return None

        summary = {
            'document_type': self.document_type,
            'owner_name': self.owner_full_name or 'Unknown',
            'attributes': self.get_all_attributes(),
            'is_complete': self.has_complete_information,
            'missing_info': self.missing_information,
            'is_authenticated': self.is_authenticated
        }

        return summary

    def clean(self):
        from django.core.exceptions import ValidationError

        # Ensure identification documents have owner name if available
        if self.is_identification_document and not self.owner_full_name and not self.document_attributes:
            raise ValidationError({
                'owner_full_name': 'Identification documents should have owner name or document attributes.'
            })


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
