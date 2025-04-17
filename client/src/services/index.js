import axiosInstance from "@/api/axiosInstance";

export async function registerService(formData) {
  const { data } = await axiosInstance.post("/auth/register", {
    ...formData,
    role: "user",
  });
  return data;
}

export async function loginService(formData) {
  const { data } = await axiosInstance.post("/auth/login", formData);
  return data;
}

export async function checkAuthService() {
  const { data } = await axiosInstance.get("/auth/check-auth");
  return data;
}

export const mediaUploadService = async (file) => {
  try {
    console.log("Uploading file:", {
      name: file.name,
      type: file.type,
      size: file.size,
    });

    const formData = new FormData();
    formData.append("file", file);

    const { data } = await axiosInstance.post("/media/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data;
  } catch (error) {
    console.error("Upload error:", error.response?.data || error.message);
    throw error;
  }
};

export async function mediaDeleteService(id) {
  const { data } = await axiosInstance.delete(`/media/delete/${id}`);
  return data;
}

export async function fetchInstructorCourseListService() {
  const { data } = await axiosInstance.get("/instructor/course/get");
  return data;
}

export async function addNewCourseService(formData) {
  const { data } = await axiosInstance.post("/instructor/course/add", formData);
  return data;
}

export async function fetchInstructorCourseDetailsService(id) {
  const { data } = await axiosInstance.get(`/instructor/course/get/details/${id}`);
  return data;
}

export async function updateCourseByIdService(id, formData) {
  const { data } = await axiosInstance.put(`/instructor/course/update/${id}`, formData);
  return data;
}

export async function mediaBulkUploadService(formData, onProgressCallback) {
  const { data } = await axiosInstance.post("/media/bulk-upload", formData, {
    onUploadProgress: (progressEvent) => {
      const percentCompleted = Math.round(
        (progressEvent.loaded * 100) / progressEvent.total
      );
      onProgressCallback(percentCompleted);
    },
  });
  return data;
}

export async function fetchStudentViewCourseListService(query) {
  const { data } = await axiosInstance.get(`/student/course/get?${query}`);
  return data;
}

export async function fetchStudentViewCourseDetailsService(courseId) {
  const { data } = await axiosInstance.get(`/student/course/get/details/${courseId}`);
  return data;
}

export async function checkCoursePurchaseInfoService(courseId, studentId) {
  const { data } = await axiosInstance.get(
    `/student/course/purchase-info/${courseId}/${studentId}`
  );

  return data;
}

export async function createPaymentService(formData) {
  try {
    const { data } = await axiosInstance.post(`/student/order/create`, formData);
    return data;
  } catch (error) {
    // Log more details about the error
    if (error.response) {
      console.error("Server response error:", error.response.data);
    }
    throw error; // Re-throw so the calling code can handle it
  }
}

export async function captureAndFinalizePaymentService(
  paymentId,
  payerId,
  orderId
) {
  const { data } = await axiosInstance.post(`/student/order/capture`, {
    paymentId,
    payerId,
    orderId,
  });

  return data;
}

export async function fetchStudentBoughtCoursesService(studentId) {
  try {
    // Construct the full URL path
    const url = `/student/courses-bought/get/${studentId}`;
    console.log('Fetching courses from:', url); // Debug log
    
    const response = await axiosInstance.get(url);
    return response.data;
  } catch (error) {
    console.error('Error fetching student courses:', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
      url: error.config?.url
    });
    throw error;
  }
}

export async function getCurrentCourseProgressService(userId, courseId) {
  const { data } = await axiosInstance.get(`/student/course-progress/get/${userId}/${courseId}`);
  return data;
}

export async function markLectureAsViewedService(userId, courseId, lectureId) {
  const { data } = await axiosInstance.post(`/student/course-progress/mark-lecture-viewed`, {
    userId,
    courseId,
    lectureId,
  });
  return data;
}

export async function resetCourseProgressService(userId, courseId) {
  const { data } = await axiosInstance.post(`/student/course-progress/reset-progress`, {
    userId,
    courseId,
  });
  return data;
}
