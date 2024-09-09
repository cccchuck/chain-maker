import axios, { AxiosInstance, AxiosRequestConfig } from 'axios'
import { logger } from './logger'

const defaultConfig: AxiosRequestConfig = {
  timeout: 1000 * 10,
}

export class Request {
  private axiosInstance: AxiosInstance

  constructor(config: AxiosRequestConfig) {
    this.axiosInstance = axios.create({
      ...defaultConfig,
      ...config,
    })
    this.axiosInstance.interceptors.request.use((config) => {
      logger.info(`Requesting ${config.url}`)
      return config
    })
  }

  public async get<T, D = Error>(
    url: string,
    config?: AxiosRequestConfig
  ): Promise<[null, T] | [D, null]> {
    try {
      const response = await this.axiosInstance.get<T>(url, config)
      if (response.status >= 400) {
        throw new Error(response.statusText)
      }
      return [null, response.data]
    } catch (error) {
      return [error as D, null]
    }
  }

  public async post<T, D = Error>(
    url: string,
    data: any,
    config?: AxiosRequestConfig
  ): Promise<[null, T] | [D, null]> {
    try {
      const response = await this.axiosInstance.post<T>(url, data, config)
      if (response.status !== 200) {
        throw new Error(response.statusText)
      }
      return [null, response.data]
    } catch (error) {
      return [error as D, null]
    }
  }
}
