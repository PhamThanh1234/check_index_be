import dotenv from 'dotenv';
dotenv.config();

import Fastify, { fastify } from 'fastify';
import sensible from '@fastify/sensible';
import cors from '@fastify/cors';
const app = Fastify({ logger: true });


app.register(cors, {
  origin: '*', 
  
});


app.register(sensible);
app.register(import('./routes/twoFa/otp'));
app.register(import('./routes/checkindex/search')); 
app.register(import('./routes/checkindex/data'));
const start = async () => {
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
