export const getApiData = (response) => response?.data?.data ?? response?.data ?? null;

export const getApiErrorMessage = (error, fallback = "Request failed") => {
  const status = error?.response?.status;
  const message =
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.message ||
    fallback;

  if (status === 429) {
    return "Too many requests. Please wait a moment and refresh the page.";
  }
  if (status === 403) {
    return message || "You do not have permission to access this resource.";
  }
  if (status === 404) {
    return message || "The requested resource was not found.";
  }

  return message;
};
