import { useState, useCallback } from 'react';
import { employeeService } from '../../api';

export const useEmployees = () => {
  const [employees, setEmployees] = useState([]);
  const [pagination, setPagination] = useState({
    totalRecords: 0,
    currentPage: 1,
    limit: 10,
    totalPages: 0,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchEmployees = useCallback(async (params = {}) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await employeeService.getEmployees(params);
      setEmployees(response.data?.employees || []);
      setPagination(response.data?.pagination || { totalRecords: 0, currentPage: 1, limit: 10, totalPages: 0 });
      return { success: true, data: response.data };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const addEmployee = useCallback(async (data) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await employeeService.createEmployee(data);
      return { success: true, data: response.data };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const editEmployee = useCallback(async (id, data) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await employeeService.updateEmployee(id, data);
      return { success: true, data: response.data };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const removeEmployee = useCallback(async (id) => {
    setIsLoading(true);
    setError(null);
    try {
      await employeeService.deleteEmployee(id);
      return { success: true };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
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
