import { FastifyPluginAsync } from 'fastify';
import { authenticator, totp } from 'otplib';

const otpRoutes: FastifyPluginAsync = async (fastify) => {
  // Cấu hình chuẩn để đảm bảo đồng bộ
  const step = 30; // thời gian sống của OTP, mặc định là 30 giây
  totp.options = { step };
  authenticator.options = { ...totp.options };

  fastify.post('/generate-otp', async (request, reply) => {
    const { secret } = request.body as { secret?: string };

    if (!secret) {
      return reply.status(400).send({ error: 'Missing secret' });
    }

    try {
      const now = Date.now(); // lấy timestamp trước khi tạo token
      const token = authenticator.generate(secret);

      // Tính thời gian hết hạn một cách thủ công cho độ chính xác tuyệt đối
      const epoch = Math.floor(now / 1000); // tính theo giây
      const timeUsedInStep = epoch % step;
      const expiresIn = step - timeUsedInStep;
      const expireAt = new Date(now + expiresIn * 1000).toISOString();

      return {
        token,
        expiresIn,
        expireAt,
      };
    } catch (err) {
      return reply.status(500).send({ error: 'Error generating OTP' });
    }
  });

  fastify.post('/verify-otp', async (request, reply) => {
    const { secret, token } = request.body as { secret?: string; token?: string };

    if (!secret || !token) {
      return reply.status(400).send({ error: 'Missing secret or token' });
    }

    try {
      const isValid = authenticator.check(token, secret);
      return { valid: isValid };
    } catch (err) {
      return reply.status(500).send({ error: 'Error verifying OTP' });
    }
  });
};

export default otpRoutes;
