import { check, group, sleep } from 'k6';
import http, { RefinedResponse, ResponseType } from 'k6/http';

export type ApiJourneyConfig = {
  baseUrl: string;
};

const defaultHeaders = {
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json'
  }
};

function url(baseUrl: string, path: string): string {
  return `${baseUrl.replace(/\/$/, '')}${path}`;
}

function checkJsonResponse(response: RefinedResponse<ResponseType>, expectedStatus: number, name: string): void {
  check(response, {
    [`${name} status is ${expectedStatus}`]: (res) => res.status === expectedStatus,
    [`${name} response is JSON`]: (res) =>
      String(res.headers['Content-Type'] || res.headers['content-type'] || '').includes('application/json')
  });
}

export function readPostList(config: ApiJourneyConfig): void {
  const response = http.get(url(config.baseUrl, '/posts'), defaultHeaders);
  checkJsonResponse(response, 200, 'GET /posts');
}

export function readSinglePost(config: ApiJourneyConfig, postId = 1): void {
  const response = http.get(url(config.baseUrl, `/posts/${postId}`), defaultHeaders);
  checkJsonResponse(response, 200, 'GET /posts/{id}');
}

export function readPostComments(config: ApiJourneyConfig, postId = 1): void {
  const response = http.get(url(config.baseUrl, `/posts/${postId}/comments`), defaultHeaders);
  checkJsonResponse(response, 200, 'GET /posts/{id}/comments');
}

export function createPost(config: ApiJourneyConfig): void {
  const response = http.post(
    url(config.baseUrl, '/posts'),
    JSON.stringify({
      title: 'k6 generated post',
      body: 'Created by the K6 TypeScript performance suite',
      userId: 1
    }),
    defaultHeaders
  );

  checkJsonResponse(response, 201, 'POST /posts');
}

export function updatePost(config: ApiJourneyConfig, postId = 1): void {
  const response = http.put(
    url(config.baseUrl, `/posts/${postId}`),
    JSON.stringify({
      id: postId,
      title: 'k6 replaced post',
      body: 'Updated by the K6 TypeScript performance suite',
      userId: 1
    }),
    defaultHeaders
  );

  checkJsonResponse(response, 200, 'PUT /posts/{id}');
}

export function patchPost(config: ApiJourneyConfig, postId = 1): void {
  const response = http.patch(
    url(config.baseUrl, `/posts/${postId}`),
    JSON.stringify({
      title: 'k6 patched post'
    }),
    defaultHeaders
  );

  checkJsonResponse(response, 200, 'PATCH /posts/{id}');
}

export function deletePost(config: ApiJourneyConfig, postId = 1): void {
  const response = http.del(url(config.baseUrl, `/posts/${postId}`), null, defaultHeaders);

  check(response, {
    'DELETE /posts/{id} status is 200': (res) => res.status === 200
  });
}

export function fullJsonPlaceholderJourney(config: ApiJourneyConfig): void {
  group('JSONPlaceholder CRUD journey', () => {
    readPostList(config);
    readSinglePost(config);
    readPostComments(config);
    createPost(config);
    updatePost(config);
    patchPost(config);
    deletePost(config);
  });

  sleep(1);
}
