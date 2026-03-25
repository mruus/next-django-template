from rest_framework.exceptions import NotFound
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response

from utils.defaults import APIResponse


class CustomPagination(PageNumberPagination):
    page_size = 10
    page_query_param = "page"
    page_size_query_param = "page_size"
    max_page_size = 100

    def paginate_queryset(self, queryset, request, view=None):
        """
        If page is out of range, fallback to page 1
        """
        self.request = request
        try:
            return super().paginate_queryset(queryset, request, view)
        except NotFound:
            self.page = self.django_paginator_class(
                queryset, self.get_page_size(request)
            ).page(1)
            return list(self.page)

    def get_paginated_response(self, data):
        paginator = self.page.paginator

        return APIResponse.success(
            message = {
                "data":data,
                "count":paginator.count,
                "page":self.page.number,
                "page_size":paginator.per_page,
                "total_pages":paginator.num_pages,
            }
        )
        # return Response({
        #     "data": data,
        #     "count": paginator.count,
        #     "page": self.page.number,
        #     "page_size": paginator.per_page,
        #     "total_pages": paginator.num_pages,
        # })
