from django.urls import path

from . import views

app_name = "core_users"

urlpatterns = [
    path("", views.UserListView.as_view(), name="user-list"),
    path("create/", views.UserCreateView.as_view(), name="user-create"),
    path("search/", views.UserSearchView.as_view(), name="user-search"),
    path(
        "<uuid:id>/groups/delta/",
        views.UserGroupsDeltaView.as_view(),
        name="user-groups-delta",
    ),
    path("<uuid:id>/groups/", views.UserGroupIdsView.as_view(), name="user-group-ids"),
    path("<uuid:id>/", views.UserRetrieveView.as_view(), name="user-retrieve"),
    path("<uuid:id>/update/", views.UserUpdateView.as_view(), name="user-update"),
    path("<uuid:id>/delete/", views.UserDeleteView.as_view(), name="user-delete"),
]
