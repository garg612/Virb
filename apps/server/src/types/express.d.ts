export {};

declare global {
  namespace Express {
    interface User {
      id: number;
      name?: string;
      email?: string;
      username?: string;
      avatar?: string | null;
      [key: string]: any;
    }

    interface Request {
      user?: User;
    }
  }
}
