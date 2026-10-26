export type JobResult = {
  job_id: string;
  filename: string;
  media_type: string;
  size_bytes: number;
  download_url: string;
  expires_in_seconds: number;
  meta: Record<string, string | number>;
};

export type Limits = {
  max_file_size_mb: number;
  max_total_size_mb: number;
  max_files: number;
  max_pages: number;
  job_ttl_seconds: number;
};

export type ApiMeta = {
  name: string;
  limits: Limits;
  tools: { slug: string; method: string; path: string }[];
};

export const defaultLimits: Limits = {
  max_file_size_mb: 25,
  max_total_size_mb: 100,
  max_files: 20,
  max_pages: 150,
  job_ttl_seconds: 3600,
};

const rawBase = import.meta.env.VITE_API_URL ?? "";
export const API_BASE = rawBase.replace(/\/$/, "");

export function apiUrl(path: string): string {
  if (/^https?:\/\//.test(path)) return path;
  return `${API_BASE}${path}`;
}

export class ApiError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
  }
}

export function toApiError(status: number, body: unknown): ApiError {
  if (body && typeof body === "object" && "error" in body) {
    const error = (body as { error?: { code?: unknown; message?: unknown } }).error;
    if (error && typeof error.message === "string") {
      const code = typeof error.code === "string" ? error.code : "processing_failed";
      return new ApiError(code, error.message, status);
    }
  }
  if (status === 413) {
    return new ApiError("file_too_large", "That file is larger than the allowed limit.", status);
  }
  if (status >= 500) {
    return new ApiError(
      "processing_failed",
      "Something went wrong while processing the file. Please try again.",
      status,
    );
  }
  if (status === 0) {
    return new ApiError("network_error", "We couldn't reach the server. Check your connection and try again.", 0);
  }
  return new ApiError("processing_failed", "We couldn't process that file. Check it and try again.", status);
}

function readBody(xhr: XMLHttpRequest): unknown {
  if (xhr.response && typeof xhr.response === "object") return xhr.response;
  if (!xhr.responseText) return null;
  try {
    return JSON.parse(xhr.responseText) as unknown;
  } catch {
    return null;
  }
}

export function postForm(
  path: string,
  form: FormData,
  onProgress?: (ratio: number) => void,
  signal?: AbortSignal,
): Promise<JobResult> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", apiUrl(path));
    xhr.responseType = "json";
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress(event.total > 0 ? event.loaded / event.total : 0);
      }
    };
    const fail = (error: ApiError) => reject(error);
    xhr.onload = () => {
      const body = readBody(xhr);
      if (xhr.status >= 200 && xhr.status < 300 && body && typeof body === "object" && "job_id" in body) {
        resolve(body as JobResult);
        return;
      }
      fail(toApiError(xhr.status, body));
    };
    xhr.onerror = () => fail(toApiError(0, null));
    xhr.onabort = () => fail(new ApiError("aborted", "The upload was cancelled.", 0));
    if (signal) {
      if (signal.aborted) {
        xhr.abort();
        return;
      }
      signal.addEventListener("abort", () => xhr.abort(), { once: true });
    }
    xhr.send(form);
  });
}

export async function getMeta(signal?: AbortSignal): Promise<ApiMeta> {
  const response = await fetch(apiUrl("/api/v1/meta"), { signal });
  if (!response.ok) {
    throw new ApiError("network_error", "Couldn't load tool limits.", response.status);
  }
  return (await response.json()) as ApiMeta;
}
