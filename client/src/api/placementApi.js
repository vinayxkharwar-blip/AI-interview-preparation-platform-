import axiosClient from './axiosClient';

export const getCurrentPlacementDrive = async () => {
  const response = await axiosClient.get('/placement/current');
  return response.data;
};

export const startPlacementDrive = async (targetRole) => {
  const response = await axiosClient.post('/placement/start', { targetRole });
  return response.data;
};

export const updatePlacementDriveRole = async (targetRole) => {
  const response = await axiosClient.patch('/placement/role', { targetRole });
  return response.data;
};

export const getPlacementDriveById = async (id) => {
  const response = await axiosClient.get(`/placement/${id}`);
  return response.data;
};

export const startAptitudeTest = async (id) => {
  const response = await axiosClient.post(`/placement/${id}/aptitude/start`);
  return response.data;
};

export const submitAptitudeTest = async (id, answers, timeSpentSeconds = 0) => {
  const response = await axiosClient.post(`/placement/${id}/aptitude/submit`, {
    answers,
    timeSpentSeconds,
  });
  return response.data;
};

export const startTechnicalRound = async (id, difficulty = 'mid') => {
  const response = await axiosClient.post(`/placement/${id}/technical/start`, { difficulty });
  return response.data;
};

export const syncTechnicalRound = async (id) => {
  const response = await axiosClient.post(`/placement/${id}/technical/sync`);
  return response.data;
};

export const startGDRound = async (id, topicIndex = 0) => {
  const response = await axiosClient.post(`/placement/${id}/gd/start`, { topicIndex });
  return response.data;
};

export const sendGDMessage = async (id, message) => {
  const response = await axiosClient.post(`/placement/${id}/gd/message`, { message });
  return response.data;
};

export const evaluateGDRound = async (id) => {
  const response = await axiosClient.post(`/placement/${id}/gd/evaluate`);
  return response.data;
};

export const startResumeRound = async (id, resumeId = null) => {
  const response = await axiosClient.post(`/placement/${id}/resume-round/start`, { resumeId });
  return response.data;
};

export const syncResumeRound = async (id) => {
  const response = await axiosClient.post(`/placement/${id}/resume-round/sync`);
  return response.data;
};

export const getPlacementFinalReport = async (id) => {
  const response = await axiosClient.get(`/placement/${id}/report`);
  return response.data;
};
