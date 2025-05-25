import fetch from 'node-fetch';

export const checkUrlStatus = async (url: string, timeout = 5000): Promise<{ url: string, status: number | string }> => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, { method: 'HEAD', signal: controller.signal });
    clearTimeout(id);
    return { url, status: response.status };
  } catch (error) {
    return { url, status: 'error' };
  }
};
