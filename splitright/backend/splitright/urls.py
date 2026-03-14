from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/v1/auth/", include("apps.accounts.urls")),
    path("api/v1/groups/", include("apps.groups.urls")),
    path("api/v1/expenses/", include("apps.groups.urls_expenses")),
    path("api/v1/auth/friends/", include("apps.friends.urls")),
]
