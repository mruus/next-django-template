from modeltranslation.translator import TranslationOptions, translator

from .models import CustomPermissions


class CustomPermissionsTranslationOptions(TranslationOptions):
    fields = ("name", "codename")


translator.register(CustomPermissions, CustomPermissionsTranslationOptions)
