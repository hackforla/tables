import { GoogleAuth } from 'google-auth-library';
import { drive } from '@googleapis/drive';
import { calendar } from '@googleapis/calendar';
import { batchFetchImplementation } from '@jrmdayn/googleapis-batcher';
/**
 * @typedef {import("gaxios").GaxiosResponse<T>} GaxiosResponse
 * @template T
 */
/**
 * @typedef {import("@googleapis/calendar").calendar_v3.Calendar} Calendar
 * @typedef {import("@googleapis/drive").drive_v3.Drive} Drive
 * @typedef {import("google-auth-library").GoogleAuth<import("google-auth-library").JWT>} JWTClient
 * @typedef {import("google-auth-library").JWTInput} JWTInput
 */

class GoogleJWTAuth {
  /** @type {JWTClient} */
  #authClient;

  /** @type {Drive | undefined} */
  #driveClient;

  /** @type {Calendar | undefined} */
  #calendarClient;

  /**
   * @param {JWTInput} jwtToken - Google Service Account JWT Token
   * @param {string[]} scopes - Google Scopes Needed
   */
  constructor (jwtToken, scopes) {
    if (!jwtToken) {
      throw new TypeError('Missing Token');
    } else if (scopes) {
      this.#authClient = new GoogleAuth({
        credentials: jwtToken,
        scopes,
      });
    } else {
      throw new TypeError('Missing Scopes');
    }
  }

  /**
   * @returns {Drive} Google Drive Client
   */
  getGDriveClient () {
    return this.#driveClient ??= drive({
      version: 'v3',
      auth: this.#authClient,
      fetchImplementation: batchFetchImplementation(),
      http2: true,
    });
  }

  /**
   * @returns {Calendar} Google Calendar Client
   */
  getGCalClient () {
    return this.#calendarClient ??= calendar({
      version: 'v3',
      auth: this.#authClient,
      fetchImplementation: batchFetchImplementation(),
      http2: true,
    });
  }
}

export default GoogleJWTAuth;
