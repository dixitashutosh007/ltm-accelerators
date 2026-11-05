export declare const handler: (event: Record<string, any>) => Promise<{
  statusCode: number;
  headers: Record<string, string>;
  body: string;
}>;
export declare function verifyIdToken(token: string): Promise<Record<string, any>>;
export declare function setActivityStore(store: { listUsers(): Promise<any[]>; listAssessments(): Promise<any[]>; userDetail(email: string): Promise<any> } | null): void;
