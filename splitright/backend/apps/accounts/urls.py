from django.urls import path
from . import views

urlpatterns = [
    path("me/", views.CurrentUserView.as_view(), name="current_user"),
    path("profile/", views.ProfileView.as_view(), name="profile"),
    path("dashboard/", views.DashboardView.as_view(), name="dashboard"),
]
