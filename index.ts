import express, { NextFunction, Response, Request, ErrorRequestHandler } from 'express';
import { createClient } from 'redis';
import { Sequelize } from 'sequelize';
import mongoose from 'mongoose';
import os from 'os';
import pidusage from 'pidusage';
import axios from 'axios';

const app = express();

app.use((req, res, next) => {
  let err = null;
  try {
    decodeURIComponent(req.path);
  } catch (e) {
    err = e;
  }
  if (err) {
    res.end('Method not found');
    return;
  }
  next();
});

app.get('/health/service', async (req: Request, res: Response) => {
  const { name } = req.query;
  const timeout = 10000;
  try {
    if (!name) {
      return res.json({ name: 'Unknow', status: 'Offline', message: 'Offline' });
    }
    if (name === 'postgres') {
      const sequelize = new Sequelize('postgres://user:pass@example.com:5432/dbname', {
        dialect: 'postgres'
      });
      await sequelize.authenticate();
    } else if (name == 'mongodb') {
      await mongoose.connect('mongodb://localhost:27017/test', { serverSelectionTimeoutMS: timeout });
    } else if (name === 'redis') {
      const client = createClient({ url: 'redis://alice:foobared@awesome.redis.server:6380' });
      await client.connect();
    } else if (name === 'api') {
      await axios.get('https://example.com', { timeout });
    }
    res.json({ name, status: 'Online', message: 'Online' });
  } catch (err) {
    res.json({ name, status: 'Offline', message: (err as Error).message });
  }
});

app.get('/stat/service', async (req: Request, res: Response) => {
  try {
    const pid = process.pid;
    const stats = await pidusage(pid);
    const data = {
      stats,
      process: {
        pid,
        memoryUsage: process.memoryUsage(),
        uptime: process.uptime(),
        versions: process.versions,
        cpuUsage: process.cpuUsage(),
        resourceUsage: process.resourceUsage()
      },
      os: {
        cpus: os.cpus(),
        totalmem: os.totalmem(),
        freemem: os.freemem(),
        uptime: os.uptime(),
        version: os.version(),
        hostname: os.hostname(),
        release: os.release()
      }
    };
    res.json({ status: 'Online', message: 'Online', data });
  } catch (err: any) {
    res.json({ status: 'Offline', message: err.message });
  }
});

app.all('*', (req: Request, res: Response) => {
  return res.status(405).json({
    statusCode: 405,
    message: 'Method not allowed'
  });
});

app.use((err: ErrorRequestHandler, req: Request, res: Response, next: NextFunction) => {
  res.status(500).send('Something broke!');
})

app.listen(3000, () => console.log('App running port 3000'));
