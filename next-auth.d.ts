declare module 'next-auth' {
  export interface Session {
    user?: {
      id?: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }

  export interface NextAuthOptions {
    providers?: any[];
    session?: any;
    pages?: any;
    callbacks?: any;
  }

  export default function NextAuth(options: NextAuthOptions): any;
}

declare module 'next-auth/next' {
  export function getServerSession(options: any): Promise<any>;
}