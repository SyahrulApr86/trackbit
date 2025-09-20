declare module 'next-auth' {
  export interface NextAuthOptions {
    providers?: any[];
    session?: any;
    pages?: any;
    callbacks?: any;
  }

  export default function NextAuth(options: NextAuthOptions): any;
}