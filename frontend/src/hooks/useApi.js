import { useState, useEffect } from 'react';
import api from '../utils/api';

export const useApi = (url, options = {}) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await api.get(url, options);
      setData(response.data);
      setError(null);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  const postData = async (postData) => {
    try {
      setLoading(true);
      const response = await api.post(url, postData, options);
      setData(response.data);
      setError(null);
      return response.data;
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const putData = async (putData) => {
    try {
      setLoading(true);
      const response = await api.put(url, putData, options);
      setData(response.data);
      setError(null);
      return response.data;
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const deleteData = async () => {
    try {
      setLoading(true);
      const response = await api.delete(url, options);
      setData(response.data);
      setError(null);
      return response.data;
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (options.autoFetch !== false) {
      fetchData();
    }
  }, [url]);

  return { data, loading, error, fetchData, postData, putData, deleteData };
};