import { normalizeRole, isStudent } from "./roles";

export const getPostAuthPath = (userData) => {
  const role = normalizeRole(userData?.role);

  if (isStudent(userData?.role) && !userData?.onboardingCompleted) {
    return "/onboarding";
  }
  if (role === "Member") {
    return "/student";
  }
  if (role === "Organization Admin") {
    return "/admin";
  }
  if (role === "Finance Manager") {
    return "/treasurer";
  }
  return "/dashboard";
};
