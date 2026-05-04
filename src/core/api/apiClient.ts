/**
 * Singleton API Client
 * Using the Singleton pattern to ensure only one instance of the fetch configuration exists.
 */
class ApiClient {
  private static instance: ApiClient;
  private baseUrl: string;

  private constructor() {
    // In a real scenario, this would come from environment variables
    this.baseUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.example.com';
  }

  public static getInstance(): ApiClient {
    if (!ApiClient.instance) {
      ApiClient.instance = new ApiClient();
    }
    return ApiClient.instance;
  }

  public async get<T>(path: string): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`);
    if (!response.ok) throw new Error('Network response was not ok');
    return response.json() as Promise<T>;
  }

  public async post<T>(path: string, body: any): Promise<T> {
    // Simulating post request
    console.log(`POST to ${path}`, body);
    
    // Mocking response for now as per requirements
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({} as T);
      }, 1500);
    });
  }
}

export const apiClient = ApiClient.getInstance();
