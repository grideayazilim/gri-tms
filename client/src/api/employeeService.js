import { api } from "./httpClient";

// Çalışanları getir (filtreleme + sayfalama)
export const getEmployees = async (params = {}) => {
  const response = await api.get("/employees", { params });
  return response;
};

// Yeni çalışan ekle
export const createEmployee = async (data) => {
  const response = await api.post("/employees", data);
  return response;
};

// Çalışan güncelle
export const updateEmployee = async (employeeId, data) => {
  const response = await api.put(`/employees/${employeeId}`, data);
  return response;
};

// Çalışan sil
export const deleteEmployee = async (employeeId) => {
  const response = await api.delete(`/employees/${employeeId}`);
  return response;
};
