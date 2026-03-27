import os
from datetime import timedelta
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()


# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent


# Quick-start development settings - unsuitable for production
# See https://docs.djangoproject.com/en/6.0/howto/deployment/checklist/

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = os.getenv("SECRET_KEY")

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = os.getenv("DEBUG") == "True" or "true"

ALLOWED_HOSTS = os.getenv("ALLOWED_HOSTS").split(",")

# Application definition

INSTALLED_APPS = [
    "modeltranslation",
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
]


INSTALLED_PACKAGES = [
    "rest_framework",
    "corsheaders",
    "drf_spectacular",
    "drf_spectacular_sidecar",
    "treenode",
    "channels",
]

CORE_APPS = ["core", "personnel"]

INSTALLED_APPS += INSTALLED_PACKAGES + CORE_APPS

# Tell Django to use Channels instead of the default ASGI handler
ASGI_APPLICATION = "config.asgi.application"

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.locale.LocaleMiddleware",  # ← ADD THIS LINE
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "utils.middleware.SuperuserStaffGuardMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"


# Database
# https://docs.djangoproject.com/en/6.0/ref/settings/#databases

# DATABASES = {
#     "default": {
#         "ENGINE": "django.db.backends.sqlite3",
#         "NAME": BASE_DIR / "db.sqlite3",
#     }
# }

# PostgreSQL
# DATABASES = {
#     "default": {
#         "ENGINE": "django.db.backends.postgresql",
#         "NAME": os.getenv("DB_NAME"),
#         "USER": os.getenv("DB_USER"),
#         "PASSWORD": os.getenv("DB_PASSWORD"),
#         "HOST": "localhost",
#         "PORT": "5432",
#     }
# }

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.mysql',
        'OPTIONS': {
            'init_command': 'SET default_storage_engine=INNODB',
        },
        'NAME': os.getenv('DB_NAME'),
        'USER': os.getenv('DB_USER'),
        # 'PASSWORD': os.getenv('DB_PASSWORD'),
        'HOST': '127.0.0.1',
        'PORT': '3306',
    },

}

# Custom user model
AUTH_USER_MODEL = "core.User"

# Custom authentication backends
AUTHENTICATION_BACKENDS = [
    "core.backends.EmailBackend",  # Allow authentication by email
    "django.contrib.auth.backends.ModelBackend",  # Default backend as fallback
]

# Password validation
# https://docs.djangoproject.com/en/6.0/ref/settings/#auth-password-validators

AUTH_PASSWORD_VALIDATORS = [
    {
        "NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.CommonPasswordValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.NumericPasswordValidator",
    },
]


# Internationalization
# https://docs.djangoproject.com/en/6.0/topics/i18n/
LANGUAGES = [
    ("en", "English"),
    ("ar", "Arabic"),
    ("so", "Somali"),
]

LANGUAGE_CODE = "ar"
MODELTRANSLATION_DEFAULT_LANGUAGE = "en"  # important

TIME_ZONE = "UTC"

USE_I18N = True

USE_TZ = True


# Static files (CSS, JavaScript, Images)
# https://docs.djangoproject.com/en/6.0/howto/static-files/

STATIC_URL = "static/"
STATIC_ROOT = os.path.join(BASE_DIR, "staticfiles")

# Django REST Framework Configuration
# https://www.django-rest-framework.org/
REST_FRAMEWORK = {
    # Default authentication classes - JWT authentication for API endpoints
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ),
    # Default permission classes - require authentication for all endpoints
    "DEFAULT_PERMISSION_CLASSES": ("rest_framework.permissions.IsAuthenticated",),
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
}

# JWT ENV VALUES
ACCESS_MINUTES = os.getenv("ACCESS_MINUTES")
REFRESH_HOURS = os.getenv("REFRESH_HOURS")
SLIDING_MINUTES = os.getenv("SLIDING_MINUTES")
SLIDING_REFRESH_DAYS = os.getenv("SLIDING_REFRESH_DAYS")


if DEBUG:
    ACCESS_MINUTES = 15
    REFRESH_HOURS = 6
    SLIDING_MINUTES = 15
    SLIDING_REFRESH_DAYS = 1

# Simple JWT Configuration
# https://django-rest-framework-simplejwt.readthedocs.io/
SIMPLE_JWT = {
    # Access token lifetime: 5 minutes (300 seconds)
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=ACCESS_MINUTES),
    # Refresh token lifetime: 5 hours (18000 seconds)
    "REFRESH_TOKEN_LIFETIME": timedelta(hours=REFRESH_HOURS),
    # Allow token refresh even after access token has expired
    "ROTATE_REFRESH_TOKENS": True,
    # Blacklist refresh tokens after use
    "BLACKLIST_AFTER_ROTATION": True,
    # Update last login field on token refresh
    "UPDATE_LAST_LOGIN": True,
    # Algorithm for signing tokens
    "ALGORITHM": "HS256",
    # Signing key - using Django's SECRET_KEY
    "SIGNING_KEY": SECRET_KEY,
    # Token verification key
    "VERIFYING_KEY": None,
    # Audience claim
    "AUDIENCE": None,
    # Issuer claim
    "ISSUER": None,
    # Token type header
    "AUTH_HEADER_TYPES": ("Bearer",),
    # User ID claim field
    "USER_ID_FIELD": "id",
    # User ID claim
    "USER_ID_CLAIM": "user_id",
    # Token type claim
    "TOKEN_TYPE_CLAIM": "token_type",
    # JTI claim
    "JTI_CLAIM": "jti",
    # Sliding token refresh lifetime
    "SLIDING_TOKEN_REFRESH_LIFETIME": timedelta(days=SLIDING_REFRESH_DAYS),
    # Sliding token lifetime
    "SLIDING_TOKEN_LIFETIME": timedelta(minutes=SLIDING_MINUTES),
}


# CORS (Cross-Origin Resource Sharing) Configuration
# https://github.com/adamchainz/django-cors-headers
CORS_ALLOW_ALL_ORIGINS = True  # Allow all origins during development
# For production, use specific origins:
# CORS_ALLOWED_ORIGINS = [
#     "http://localhost:3000",
#     "http://127.0.0.1:3000",
# ]

# CORS settings for development
CORS_ALLOW_CREDENTIALS = True  # Allow cookies to be included in cross-origin requests
CORS_ALLOW_METHODS = [
    "DELETE",
    "GET",
    "OPTIONS",
    "PATCH",
    "POST",
    "PUT",
]
CORS_ALLOW_HEADERS = [
    "accept",
    "accept-encoding",
    "authorization",
    "content-type",
    "dnt",
    "origin",
    "user-agent",
    "x-csrftoken",
    "x-requested-with",
    "x-forwarded-for",
]


# Email Configuration
EMAIL_BACKEND = "django.core.mail.backends.smtp.EmailBackend"
EMAIL_HOST = "smtp.gmail.com"  # Using Gmail SMTP, change for production
EMAIL_PORT = 587
EMAIL_USE_TLS = True
EMAIL_HOST_USER = os.getenv("EMAILHOSTUSERNAME")
EMAIL_HOST_PASSWORD = os.getenv("EMAILHOSTPASSWORD")
DEFAULT_FROM_EMAIL = EMAIL_HOST_USER


SPECTACULAR_SETTINGS = {
    "TITLE": "My API",
    "DESCRIPTION": "Backend APIs",
    "VERSION": "1.0.0",
    "SWAGGER_UI_SETTINGS": {
        "persistAuthorization": True,  # keeps token after refresh
        "displayOperationId": True,  # shows operation IDs
        "filter": True,  # adds search bar
        "tryItOutEnabled": True,  # enables try it out by default
    },
    # If using sidecar (self-hosted assets, no CDN)
    # 'SWAGGER_UI_DIST': 'SIDECAR',
    # 'SWAGGER_UI_FAVICON_HREF': 'SIDECAR',
    # 'REDOC_DIST': 'SIDECAR',
}


REDIS_HOST = os.getenv("REDIS_HOST", "127.0.0.1")
REDIS_PORT = int(os.getenv("REDIS_PORT", 6380))
REDIS_PASSWORD = os.getenv("REDIS_PASSWORD")


# Channel Layer (database 0)
_channel_host = {"host": REDIS_HOST, "port": REDIS_PORT, "db": 0}
if REDIS_PASSWORD:
    _channel_host["password"] = REDIS_PASSWORD
CHANNEL_LAYERS = {
    "default": {
        "BACKEND": "channels_redis.core.RedisChannelLayer",
        "CONFIG": {"hosts": [_channel_host]},
    }
}


# Permissions Cache (database 1 — separate from channel layer)
_redis_location = (
    f"redis://:{REDIS_PASSWORD}@{REDIS_HOST}:{REDIS_PORT}/1"
    if REDIS_PASSWORD
    else f"redis://{REDIS_HOST}:{REDIS_PORT}/1"
)
CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.redis.RedisCache",
        "LOCATION": _redis_location,
    }
}
