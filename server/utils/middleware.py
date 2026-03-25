from utils.cache import enforce_master_superuser_policy


class SuperuserStaffGuardMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if request.user.is_authenticated:
            enforce_master_superuser_policy(request.user)
        return self.get_response(request)
