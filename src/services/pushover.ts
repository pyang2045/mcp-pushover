import axios from 'axios';
import pRetry from 'p-retry';
import { PushoverMessage, PushoverResponse } from '../types/index.js';
import { PushoverError } from '../errors.js';
import { config } from '../config.js';

const PUSHOVER_API_URL = 'https://api.pushover.net/1/messages.json';

export async function sendPushoverMessage(params: PushoverMessage): Promise<PushoverResponse> {
  return pRetry(
    async () => {
      try {
        const response = await axios.post<PushoverResponse>(
          PUSHOVER_API_URL,
          params,
          {
            headers: { 
              'Content-Type': 'application/x-www-form-urlencoded' 
            },
            timeout: 10000,
          }
        );

        if (response.data.status !== 1) {
          throw new PushoverError(
            `Pushover API error: ${response.data.errors?.join(', ') || 'Unknown error'}`,
            response.status,
            response.data.errors
          );
        }

        return response.data;
      } catch (error) {
        if (axios.isAxiosError(error)) {
          if (error.response) {
            // Don't retry client errors (4xx)
            if (error.response.status >= 400 && error.response.status < 500) {
              throw new PushoverError(
                `Client error: ${error.response.statusText}`,
                error.response.status
              );
            }
            // Server error - will be retried
            throw new PushoverError(
              `Server error: ${error.response.statusText}`,
              error.response.status
            );
          }
          // Network error - will be retried
          throw new PushoverError(`Network error: ${error.message}`);
        }
        throw error;
      }
    },
    {
      retries: config.RETRY_MAX_ATTEMPTS,
      factor: 2,
      minTimeout: config.RETRY_INITIAL_DELAY,
      randomize: true, // Adds jitter
      onFailedAttempt: (error) => {
        console.error(`Pushover attempt ${error.attemptNumber} failed:`, error.message);
      },
      shouldRetry: (error: unknown) => {
        // Only retry on network errors or 5xx responses
        if (error instanceof PushoverError) {
          return !error.statusCode || error.statusCode >= 500;
        }
        return false;
      },
    }
  );
}