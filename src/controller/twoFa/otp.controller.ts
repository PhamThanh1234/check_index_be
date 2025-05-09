import { FastifyRequest, FastifyReply } from 'fastify';
import { getOtpFromEmail } from '../../service/imap.service';

export async function getOtpHandler(
  req: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    const otp = await getOtpFromEmail();
    if (otp) {
      reply.send({ success: true, otp });
    } else {
      reply.code(404).send({ success: false, message: 'No OTP found' });
    }
  } catch (err: any) {
    req.log.error(err);
    reply.code(500).send({ success: false, error: err.message });
  }
}
