import axiosClient from './axiosClient';

// Public & Student Endpoints
export const getAvailableCompanies = async () => {
  const response = await axiosClient.get('/aptitude/companies');
  return response.data;
};

export const getFilteredQuestionsInfo = async (params = {}) => {
  const response = await axiosClient.get('/aptitude/questions', { params });
  return response.data;
};

export const startPYQTest = async (config) => {
  const response = await axiosClient.post('/aptitude/tests/start', config);
  return response.data;
};

export const submitPYQTest = async (testId, answers, timeSpentSeconds = 0) => {
  const response = await axiosClient.post(`/aptitude/tests/${testId}/submit`, {
    answers,
    timeSpentSeconds,
  });
  return response.data;
};

export const getPYQTestResult = async (testId) => {
  const response = await axiosClient.get(`/aptitude/tests/${testId}/result`);
  return response.data;
};

export const getUserPYQAttempts = async () => {
  const response = await axiosClient.get('/aptitude/attempts');
  return response.data;
};

// Admin Endpoints
export const importPYQQuestions = async (payload) => {
  const response = await axiosClient.post('/admin/aptitude/import', payload);
  return response.data;
};

export const getAdminPYQQuestions = async (params = {}) => {
  const response = await axiosClient.get('/admin/aptitude/questions', { params });
  return response.data;
};

export const verifyPYQQuestion = async (id) => {
  const response = await axiosClient.post(`/admin/aptitude/questions/${id}/verify`);
  return response.data;
};

export const updatePYQQuestion = async (id, updates) => {
  const response = await axiosClient.patch(`/admin/aptitude/questions/${id}`, updates);
  return response.data;
};

export const deletePYQQuestion = async (id) => {
  const response = await axiosClient.delete(`/admin/aptitude/questions/${id}`);
  return response.data;
};
