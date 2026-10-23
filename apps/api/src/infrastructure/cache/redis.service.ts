import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis | null = null;
  private isConnected = false;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    const redisUrl = this.configService.get<string>('REDIS_URL') || 'redis://localhost:6379';

    try {
      this.client = new Redis(redisUrl, {
        maxRetriesPerRequest: 3,
        retryStrategy: (times) => {
          if (times > 5) {
            this.logger.warn('Redis reconnection attempts exhausted. Operating in fallback mode.');
            return null;
          }
          return Math.min(times * 200, 2000);
        },
      });

      this.client.on('connect', () => {
        this.isConnected = true;
        this.logger.log('Successfully connected to Redis 7');
      });

      this.client.on('error', (err) => {
        this.isConnected = false;
        this.logger.warn(`Redis connection warning: ${err.message}`);
      });
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Failed to initialize Redis client: ${errorMsg}`);
    }
  }

  async onModuleDestroy() {
    if (this.client) {
      await this.client.quit();
      this.logger.log('Disconnected from Redis');
    }
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.client || !this.isConnected) return null;
    try {
      const data = await this.client.get(key);
      if (!data) return null;
      return JSON.parse(data) as T;
    } catch (error) {
      this.logger.warn(`Cache read error for key ${key}: ${error}`);
      return null;
    }
  }

  async set(key: string, value: unknown, ttlSeconds = 3600): Promise<void> {
    if (!this.client || !this.isConnected) return;
    try {
      const serialized = JSON.stringify(value);
      await this.client.set(key, serialized, 'EX', ttlSeconds);
    } catch (error) {
      this.logger.warn(`Cache write error for key ${key}: ${error}`);
    }
  }

  async del(key: string): Promise<void> {
    if (!this.client || !this.isConnected) return;
    try {
      await this.client.del(key);
    } catch (error) {
      this.logger.warn(`Cache delete error for key ${key}: ${error}`);
    }
  }

  async sismember(key: string, member: string): Promise<boolean> {
    if (!this.client || !this.isConnected) return false;
    try {
      const result = await this.client.sismember(key, member);
      return result === 1;
    } catch (error) {
      this.logger.warn(`Set member check error for key ${key}: ${error}`);
      return false;
    }
  }

  async sadd(key: string, ...members: string[]): Promise<number> {
    if (!this.client || !this.isConnected || members.length === 0) return 0;
    try {
      return await this.client.sadd(key, ...members);
    } catch (error) {
      this.logger.warn(`Set add error for key ${key}: ${error}`);
      return 0;
    }
  }

  async srem(key: string, ...members: string[]): Promise<number> {
    if (!this.client || !this.isConnected || members.length === 0) return 0;
    try {
      return await this.client.srem(key, ...members);
    } catch (error) {
      this.logger.warn(`Set remove error for key ${key}: ${error}`);
      return 0;
    }
  }

  async smembers(key: string): Promise<string[]> {
    if (!this.client || !this.isConnected) return [];
    try {
      return await this.client.smembers(key);
    } catch (error) {
      this.logger.warn(`Set smembers error for key ${key}: ${error}`);
      return [];
    }
  }

  getClient(): Redis | null {
    return this.client;
  }
}
