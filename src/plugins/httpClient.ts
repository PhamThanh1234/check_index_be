export const checkUrlStatus = async (url: string) => {
  try {
    // Thử request HEAD trước
    let response = await fetch(url, {
      method: "HEAD",
      mode: "cors",  // hoặc no-cors tùy setup backend
    });

    if (response.status === 405) {
      // Nếu lỗi 405, fallback sang GET
      response = await fetch(url, {
        method: "GET",
        mode: "cors",
      });
    }

    return { url, status: response.status };
  } catch (error) {
    return { url, status: "error" };
  }
};
