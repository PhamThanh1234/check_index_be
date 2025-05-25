import dotenv from 'dotenv';
dotenv.config();

import multipart from '@fastify/multipart';
import Fastify from 'fastify';
import sensible from '@fastify/sensible';
import cors from '@fastify/cors';

const app = Fastify({ logger: true });

const start = async () => {
  app.register(cors, {
    origin: '*',
  });

  await app.register(multipart, {
    limits: {
      fileSize: 10 * 1024 * 1024,
    },
  });

  app.register(sensible);
  app.register(import('./routes/twoFa/otp'));
  app.register(import('./routes/checkindex/search'));
  app.register(import('./routes/checkindex/data'));
  app.register(import('./routes/checklink/checkLink'));
  app.register(import('./routes/geotagimg/metadataRoutes'));
  app.register(import('./routes/geotagimg/metaRoutes'));
  app.register(import('./routes/geotagimg/imageRoutes'));
  try {
    await app.listen({ port: 8888, host: '0.0.0.0' });
    console.log('🚀 Server listening on http://localhost:8888');
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();

export default app;
