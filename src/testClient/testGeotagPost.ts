import fs from 'fs';
import path from 'path';
import FormData from 'form-data';
import fetch from 'node-fetch';

async function testGeotagPost() {
  const url = 'http://localhost:8888/set'; // Updated port to 8888

  const form = new FormData();
  const imagePath = path.join(__dirname, 'testImage.jpg'); // Provide a valid test image path
  form.append('file', fs.createReadStream(imagePath));
  form.append('latitude', '10.762622');
  form.append('longitude', '106.660172');
  form.append('title', 'Hồ Con Rùa');
  form.append('subject', 'Cảnh đẹp Sài Gòn');
  form.append('keywords', 'TPHCM, du lịch, landmark');
  form.append('copyright', '© 2025 MyCompany');
  form.append('author', 'Nguyễn Văn A');
  form.append('comment', 'Chụp bằng iPhone 15 Pro Max');
  form.append('rating', '5');
  form.append('dateTaken', '2025-05-15T10:30:00.000Z');

  try {
    const response = await fetch(url, {
      method: 'POST',
      body: form,
      headers: form.getHeaders(),
      timeout: 60000, // 60 seconds timeout
    });

    if (!response.ok) {
      console.error('Response error:', response.status, response.statusText);
      const errorText = await response.text();
      console.error('Error body:', errorText);
      return;
    }

    const buffer = await response.buffer();
    const outputPath = path.join(__dirname, 'output.jpg');
    fs.writeFileSync(outputPath, buffer);
    console.log('Received modified image saved to', outputPath);
  } catch (error) {
    console.error('Request failed:', error);
  }
}

testGeotagPost();
