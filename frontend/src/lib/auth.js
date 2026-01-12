// lib/auth.js
import { queryClient } from './queryClient';

export const getAuthUserId = () => {
  const data = queryClient.getQueryData(["authUser"]);
  return data?.user?.id ?? null;
};
