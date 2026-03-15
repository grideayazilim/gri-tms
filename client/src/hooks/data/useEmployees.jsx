import { useState, useCallback } from 'react';
import * as employeeService from '../../api/employeeService';

export const useEmployees = () => {
  const [employees, setEmployees] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchEmployees = useCallback(async (params = {}) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await employeeService.getEmployees(params);
      setEmployees(response.data?.employees || []);
      setPagination(response.data?.pagination || null);
      return { success: true, data: response.data };
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message;
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const addEmployee = useCallback(async (data, currentParams = {}) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await employeeService.createEmployee(data);
      // Listeyi yenile
      const listResponse = await employeeService.getEmployees(currentParams);
      setEmployees(listResponse.data?.employees || []);
      setPagination(listResponse.data?.pagination || null);
      return { success: true, data: response.data };
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message;
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const editEmployee = useCallback(async (id, data, currentParams = {}) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await employeeService.updateEmployee(id, data);
      // Listeyi yenile
      const listResponse = await employeeService.getEmployees(currentParams);
      setEmployees(listResponse.data?.employees || []);
      setPagination(listResponse.data?.pagination || null);
      return { success: true, data: response.data };
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message;
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const removeEmployee = useCallback(async (id, currentParams = {}) => {
    setIsLoading(true);
    setError(null);
    try {
      await employeeService.deleteEmployee(id);
      // Listeyi yenile
      const listResponse = await employeeService.getEmployees(currentParams);
      setEmployees(listResponse.data?.employees || []);
      setPagination(listResponse.data?.pagination || null);
      return { success: true };
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message;
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    employees,
    pagination,
    isLoading,
    error,
    fetchEmployees,
    addEmployee,
    editEmployee,
    removeEmployee,
  };
};