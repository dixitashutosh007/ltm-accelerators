export declare const handler: (event: Record<string, any>) => Promise<{
  statusCode: number;
  headers: Record<string, string>;
  body: string;
}>;
export declare function verifyIdToken(token: string): Promise<Record<string, any>>;
